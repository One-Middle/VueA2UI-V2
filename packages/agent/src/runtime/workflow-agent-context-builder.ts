/**
 * ReAct WorkflowAgentContextBuilder。
 *
 * 职责：
 * - 把 WorkflowService 已拥有的数据（AgentWorkflowTaskInput）投影为 AgentExecutor 的输入
 *   （goal / facts / capabilities / limits / currentDraft）。
 * - 为 plan、revise_plan、generate_a2ui、preview_decision 等任务构建目标与允许产物。
 *
 * 不负责：查询数据库、执行模型调用、执行工具、推进 workflow 状态。
 *
 * 引用：
 * - @a2ui-platform/shared（AgentWorkflowTaskInput 等输入类型）。
 * 被引用：
 * - backend workflow.service（runWorkflowTask 迁移后调用）。
 */

import type {
  AgentRunInput,
  AgentToolName,
  AgentWorkflowTaskInput,
  JsonObject,
} from "@a2ui-platform/shared";
import type {
  AgentFinalKind,
  AgentRunFact,
  AgentWorkflowTask,
  ReactAgentRunInput,
} from "./react-agent-types.js";

/** 构建 ReactAgentRunInput 所需的参数。 */
export interface BuildReactAgentRunInputParams {
  /** 持久化的 AgentRun 记录 ID。 */
  runId: string;
  /** Workflow task 上下文（含 sessionId/workflowId/workflowStepId 与全部事实数据）。 */
  input: AgentWorkflowTaskInput;
  /** ReAct 循环最大迭代次数，缺省使用默认值。 */
  maxIterations?: number;
}

/** 默认最大迭代次数：足以支撑澄清 + 若干次工具调用 + 最终产物。 */
const DEFAULT_MAX_ITERATIONS = 20;

/**
 * 把 workflow task 上下文构建为 AgentExecutor 输入。
 */
export class WorkflowAgentContextBuilder {
  build(params: BuildReactAgentRunInputParams): ReactAgentRunInput {
    const { runId, input } = params;

    return {
      runId,
      sessionId: input.sessionId,
      workflowId: input.workflowId,
      workflowStepId: input.workflowStepId,
      goal: this.buildGoal(input.task),
      facts: this.buildFacts(input),
      currentDraft: null,
      capabilities: this.buildCapabilities(input),
      limits: { maxIterations: params.maxIterations ?? DEFAULT_MAX_ITERATIONS },
    };
  }

  private buildGoal(task: AgentWorkflowTask): ReactAgentRunInput["goal"] {
    return {
      task,
      expectedResult: expectedResultsForTask(task),
      description: goalDescriptionForTask(task),
    };
  }

  private buildCapabilities(input: AgentWorkflowTaskInput): ReactAgentRunInput["capabilities"] {
    const skillReferences = input.enabledSkills.flatMap((skill) =>
      (skill.references ?? []).map((ref) => ({
        skillId: skill.id,
        skillName: skill.name,
        referenceId: ref.id,
        title: ref.title,
      })),
    );

    return {
      allowedTools: input.availableTools ?? DEFAULT_ALLOWED_TOOLS,
      catalogId: input.catalogId,
      catalogVersion: input.catalogVersion,
      rendererVersion: input.rendererVersion,
      ...(skillReferences.length > 0 ? { skillReferences } : {}),
    };
  }

  private buildFacts(input: AgentWorkflowTaskInput): AgentRunFact[] {
    const facts: AgentRunFact[] = [];

    facts.push({
      kind: "user_request",
      label: "用户原始需求",
      content: input.userMessage,
    });

    if (input.recentMessages.length > 0) {
      facts.push({
        kind: "system",
        label: "最近对话历史",
        content: { messages: input.recentMessages },
      });
    }

    if (input.currentSnapshot) {
      facts.push({
        kind: "current_snapshot",
        label: "当前 UI 状态",
        content: input.currentSnapshot as unknown as JsonObject,
      });
    }

    if (input.enabledSkills.length > 0) {
      facts.push({
        kind: "enabled_skills",
        label: "已启用 Skills 摘要",
        content: buildSkillSummary(input.enabledSkills),
      });
    }

    if (input.uploadedFiles.length > 0) {
      facts.push({
        kind: "uploaded_files",
        label: "上传文件",
        content: {
          files: input.uploadedFiles.map((file) => ({
            id: file.id,
            originalName: file.originalName,
            content: file.content,
          })),
        },
      });
    }

    if (input.clarificationAnswers) {
      facts.push({
        kind: "clarification_answers",
        label: "用户澄清答案",
        content: input.clarificationAnswers,
      });
    }

    if (input.previousPlanMarkdown) {
      facts.push({
        kind: "confirmed_plan",
        label: "已确认或最近的方案",
        content: input.previousPlanMarkdown,
      });
    }

    if (input.revisionText) {
      facts.push({
        kind: "revision_feedback",
        label: "用户修改意见",
        content: input.revisionText,
      });
    }

    if (input.previousCandidate) {
      facts.push({
        kind: "candidate_a2ui",
        label: "历史候选 A2UI",
        content: input.previousCandidate,
      });
    }

    if (input.workflowContext) {
      facts.push({
        kind: "system",
        label: "Workflow 上下文",
        content: input.workflowContext,
      });
    }

    return facts;
  }
}

/** 默认允许的工具集合（与现有 runWorkflowTask 的默认保持一致）。 */
const DEFAULT_ALLOWED_TOOLS: AgentToolName[] = [
  "askClarification",
  "askUserDecision",
  "getSkillContent",
  "getSkillReferenceContent",
  "getCatalogComponentDetails",
];

/** 按 task 返回允许的最终产物种类。 */
function expectedResultsForTask(task: AgentWorkflowTask): AgentFinalKind[] {
  switch (task) {
    case "plan":
    case "initial_planning":
    case "revise_plan":
      return ["clarification_form", "plan_markdown"];
    case "generate_a2ui":
    case "generate_candidate":
    case "validate":
      return ["candidate_a2ui_messages"];
    case "preview_decision":
      return ["decision_form"];
    default:
      return ["clarification_form", "plan_markdown"];
  }
}

/** 按 task 生成目标描述。 */
function goalDescriptionForTask(task: AgentWorkflowTask): string {
  switch (task) {
    case "plan":
    case "initial_planning":
      return "生成 UI 创建方案（plan），必要时先向用户澄清需求。";
    case "revise_plan":
      return "根据用户修改意见修订方案（plan），必要时先向用户澄清。";
    case "generate_a2ui":
    case "generate_candidate":
      return "根据已确认的方案生成 A2UI 候选消息。";
    case "preview_decision":
      return "请求用户确认候选 A2UI（产出 decision form）。";
    case "validate":
      return "校验并修复候选 A2UI。";
    default:
      return "推进当前 workflow task。";
  }
}

/** 从已启用 skill 列表构建摘要（不含完整 content，完整内容由 getSkillContent 工具按需获取）。 */
function buildSkillSummary(skills: AgentRunInput["enabledSkills"]): JsonObject {
  return {
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description ?? null,
      sourceType: skill.sourceType ?? null,
      references: (skill.references ?? []).map((ref) => ({
        id: ref.id,
        title: ref.title,
        description: ref.description ?? null,
      })),
    })),
  };
}
