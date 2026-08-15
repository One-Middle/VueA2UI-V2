/**
 * ReAct Agent runtime 内部类型契约。
 *
 * 职责：
 * - 定义 ReAct 循环所需的运行时类型：目标、事实、能力、限制、草稿、观察、最终产物。
 * - 定义模型动作协议（AgentModelAction）与工具执行结果（ToolExecutionResult）。
 * - 定义执行结果（ReactAgentRunResult）与内部 trace 事件（AgentTraceEvent）。
 *
 * 引用：
 * - @a2ui-platform/shared（A2UI / agent / api 类型）
 * 被引用：
 * - react-action-parser、react-prompt-composer、tool-registry、
 *   workflow-agent-executor、workflow-agent-context-builder
 * 注意：
 * - 这些类型是运行时内部契约，不直接暴露给前端；前端可见的 trace DTO 在 shared。
 * - 本文件不依赖数据库、WorkflowService 或 ModelClient。
 */

import type {
  A2UIServerMessage,
  AgentRunTraceSummaryDto,
  AgentToolName,
  AgentTraceEventDto,
  AgentWorkflowTaskInput,
  ClarificationForm,
  DecisionForm,
  JsonObject,
  WorkflowArtifactKind,
} from "@a2ui-platform/shared";

/** Agent 最终产物种类 = Workflow 工件种类减去「校验报告」。 */
export type AgentFinalKind = Exclude<WorkflowArtifactKind, "validation_report">;

/** Workflow task 类型，复用 shared 的 task 联合以对齐现有 gate。 */
export type AgentWorkflowTask = AgentWorkflowTaskInput["task"];

/** Agent 运行目标：当前 task、期望产物、任务描述。 */
export interface AgentRunGoal {
  /** 当前 workflow task */
  task: AgentWorkflowTask;
  /** 期望产出的最终产物种类集合（一个 task 可能允许多种产物，如 plan 允许 clarification_form 或 plan_markdown）。 */
  expectedResult: AgentFinalKind[];
  /** 任务的自然语言描述，用于生成 user prompt。 */
  description: string;
}

/** Agent 事实类别（workflow ledger 投影到当前 task 的维度）。 */
export type AgentRunFactKind =
  | "user_request"
  | "current_snapshot"
  | "enabled_skills"
  | "uploaded_files"
  | "clarification_answers"
  | "confirmed_plan"
  | "revision_feedback"
  | "candidate_a2ui"
  | "validation_report"
  | "system";

/** 单条事实：workflow 状态投影到当前 task 的一小块上下文。 */
export interface AgentRunFact {
  /** 事实类别，用于 prompt 分组 */
  kind: AgentRunFactKind;
  /** 人类可读标题 */
  label: string;
  /** 事实内容（字符串或结构化 JSON） */
  content: JsonObject | string;
}

/** Agent 能力边界：允许的工具与渲染 / 目录环境。 */
export interface AgentCapabilities {
  /** 当前 gate 允许调用的工具集合 */
  allowedTools: AgentToolName[];
  /** Catalog ID */
  catalogId: string;
  /** Catalog 版本 */
  catalogVersion: string;
  /** Renderer 版本 */
  rendererVersion: string;
  /** 可用的 Skill Reference 摘要。 */
  skillReferences?: Array<{
    skillId: string;
    skillName: string;
    referenceId?: string;
    title: string;
  }>;
}

/** Agent 运行限制。 */
export interface AgentRunLimits {
  /** ReAct 循环最大迭代次数 */
  maxIterations: number;
}

/** 模型产出但校验未通过的草稿，保留供下一轮修复。 */
export interface AgentDraft {
  /** 草稿声明的最终产物种类 */
  finalKind: AgentFinalKind;
  /** 草稿原始 JSON 内容 */
  draft: JsonObject;
}

/** 系统产生的观察结果，注入下一轮 prompt；模型自身不能产出。 */
export interface AgentObservation {
  /** 观察来源 */
  kind: "parse_error" | "tool_result" | "validation_error" | "system";
  /** 人类可读的观察描述 */
  message: string;
  /** 结构化详情（可选） */
  details?: JsonObject;
}

/** 模型每轮输出的单一 JSON 动作。 */
export type AgentModelAction =
  | {
      type: "tool_call";
      reasoningSummary: string;
      tool: AgentToolName;
      arguments: JsonObject;
    }
  | {
      type: "final_draft";
      reasoningSummary: string;
      finalKind: AgentFinalKind;
      draft: JsonObject;
    }
  | {
      type: "give_up";
      reasoningSummary: string;
      reason: string;
      recoverable: boolean;
      details?: JsonObject;
    };

/** Agent 最终产物。 */
export type AgentFinalArtifact =
  | { kind: "clarification_form"; form: ClarificationForm }
  | { kind: "decision_form"; form: DecisionForm }
  | {
      kind: "plan_markdown";
      markdown: string;
      /** plan 确认所需的伴随决策表单（进入用户确认流程的必要产物）。 */
      decisionForm: DecisionForm;
    }
  | {
      kind: "candidate_a2ui_messages";
      messages: A2UIServerMessage[];
      assistantMessage?: string;
    };

/** 工具执行结果。 */
export type ToolExecutionResult =
  | { status: "completed"; observation: AgentObservation }
  | { status: "failed"; observation: AgentObservation; recoverable: boolean }
  | { status: "final_artifact"; artifact: AgentFinalArtifact };

/** 运行结束时持久化的 trace 摘要（复用 shared DTO，backend 可直接写入 metadata）。 */
export type AgentRunTraceSummary = AgentRunTraceSummaryDto;

/** ReAct 循环 trace 事件，直接复用 shared DTO（executor 发出完整事件，backend 零转换发 SSE）。 */
export type AgentTraceEvent = AgentTraceEventDto;

/** Agent 执行器输入。 */
export interface ReactAgentRunInput {
  runId: string;
  sessionId: string;
  workflowId: string;
  workflowStepId: string;
  goal: AgentRunGoal;
  facts: AgentRunFact[];
  currentDraft?: AgentDraft | null;
  capabilities: AgentCapabilities;
  limits: AgentRunLimits;
}

/** Agent 执行器结果。 */
export type ReactAgentRunResult =
  | {
      status: "completed";
      final: AgentFinalArtifact;
      trace: AgentRunTraceSummary;
      usage?: JsonObject;
    }
  | {
      status: "failed";
      failure: {
        reason: string;
        recoverable: boolean;
        details?: JsonObject;
      };
      trace: AgentRunTraceSummary;
      usage?: JsonObject;
    };
