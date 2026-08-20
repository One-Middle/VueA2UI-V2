/**
 * Workflow 消息聚合与展示映射的纯逻辑模块。
 *
 * 职责：
 * - 将「消息列表 + workflow 列表」聚合为「普通消息 / AI Workflow Message」两类展示项
 * - 识别 WorkflowAction 产生的用户消息（用于折叠反馈，而非独立用户气泡）
 * - 提供 Workflow Step 状态 → 视觉状态的映射、固定 Step 序列、active workflow 选择
 * - 提供内联表单（clarification / decision）的等待判定与可提交判定
 *
 * 不负责：DOM 渲染、Pinia store、网络请求。
 *
 * 被引用：
 * - MessageList.vue（消息聚合）
 * - WorkflowProgressBar.vue（进度条状态）
 * - WorkflowMessage.vue / ClarificationForm.vue / DecisionForm.vue（表单与摘要）
 * 注意：
 * - 本模块是 issue 08 的核心测试接缝，保持纯函数、无副作用。
 */

import type {
  AgentWorkflowDetailDto,
  MessageDto,
  WorkflowArtifactDto,
  WorkflowArtifactKind,
  WorkflowDecisionOption,
  WorkflowStepDto,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@a2ui-platform/shared";

/** 内联 Clarification Form 的字段结构（对应 artifact.contentJson.fields）。 */
export interface ClarificationField {
  id: string;
  label: string;
  type: "select" | "radio" | "checkbox" | "text" | "textarea";
  required: boolean;
  reason?: string;
  options?: Array<{ id?: string; label?: string; value?: string }>;
}

/** 内联 Decision Form 的结构（对应 artifact.contentJson）。 */
export interface DecisionFormData {
  title: string;
  prompt: string;
  guidance?: string;
  target: "plan_markdown" | "candidate_a2ui_messages";
  targetArtifactId?: string;
  options: Array<{ id: WorkflowDecisionOption; label: string; description?: string }>;
}

/** AI Workflow Message 展示项：同一 workflowId 下的 assistant 消息与 WorkflowAction 反馈。 */
export interface WorkflowDisplayItem {
  kind: "workflow";
  workflowId: string;
  workflow: AgentWorkflowDetailDto | null;
  /** 该 workflow 下的 assistant 消息（按时间序，作为步骤日志）。 */
  stepLogMessages: MessageDto[];
  /** 该 workflow 下由 WorkflowAction 产生的用户消息（折叠反馈，不渲染为独立气泡）。 */
  actionMessages: MessageDto[];
}

/** 消息流中的展示项：普通消息或 AI Workflow Message。 */
export type DisplayItem =
  | { kind: "message"; message: MessageDto }
  | WorkflowDisplayItem;

/** Workflow Step 状态映射出的视觉状态。 */
export type StepVisualState = "done" | "active" | "waiting" | "error" | "pending" | "skipped";

/** 固定的 Workflow Step 序列，用于进度条展示。 */
export const WORKFLOW_STEP_SEQUENCE: ReadonlyArray<{ type: WorkflowStepType; label: string }> = [
  { type: "plan", label: "Plan" },
  { type: "generate_a2ui", label: "Generate" },
  { type: "validate", label: "Validate" },
  { type: "preview", label: "Preview" },
  { type: "commit", label: "Commit" },
];

/**
 * 判断一条用户消息是否由 WorkflowAction（确认/补充/拒绝/重试等）产生。
 *
 * 后端在 workflow/actions 路由创建此类消息时写入 metadata.workflowAction，
 * 这是区分「用户主动的自然语言指令」与「Workflow 内部交互反馈」的唯一可靠依据。
 */
export function isWorkflowActionMessage(message: MessageDto): boolean {
  if (message.role !== "user") return false;
  const action = (message.metadata as { workflowAction?: unknown } | undefined)?.workflowAction;
  return typeof action === "string" && action.length > 0;
}

/**
 * 将消息列表 + workflow 列表聚合为展示项列表。
 *
 * 规则（由 workflow 驱动，而非仅由消息驱动）：
 * - 每个 workflow 对应一条 AI Workflow Message；即使还没有任何 assistant 消息，
 *   只要 workflow 存在（如初始 plan 等待态），也会渲染一条 Workflow Message 展示等待表单。
 * - assistant 消息带 workflowId → 归入对应 workflow（作为步骤日志）
 * - WorkflowAction 用户消息 → 归入对应 workflow（折叠反馈）
 * - 其余消息（普通用户自然语言、无 workflow 的 assistant/system/tool）→ 普通气泡
 * - Workflow Message 出现在其第一条关联消息的位置；没有关联消息的 workflow 追加到末尾
 *
 * @param messages 会话消息（按时间序）
 * @param workflows 已加载的 workflow 列表（用于补全详情）
 */
export function buildDisplayItems(
  messages: MessageDto[],
  workflows: AgentWorkflowDetailDto[],
): DisplayItem[] {
  const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const buckets = new Map<string, { stepLogMessages: MessageDto[]; actionMessages: MessageDto[] }>();
  const anchorIndex = new Map<string, number>();

  // 第一遍：按 workflowId 收集 assistant / action 消息，并记录每个 workflow 第一条关联消息的位置
  messages.forEach((message, index) => {
    const workflowId = message.workflowId;
    if (!workflowId) return;
    const isAssistant = message.role === "assistant";
    const isAction = isWorkflowActionMessage(message);
    if (!isAssistant && !isAction) return;

    let bucket = buckets.get(workflowId);
    if (!bucket) {
      bucket = { stepLogMessages: [], actionMessages: [] };
      buckets.set(workflowId, bucket);
    }
    if (isAssistant) {
      bucket.stepLogMessages.push(message);
    } else {
      bucket.actionMessages.push(message);
    }
    if (!anchorIndex.has(workflowId)) anchorIndex.set(workflowId, index);
  });

  const items: DisplayItem[] = [];
  const emitted = new Set<string>();

  // 第二遍：按消息顺序输出。到达某 workflow 的 anchor 时输出 Workflow Message；
  // 已归入 workflow 的消息跳过，其余消息作为普通气泡输出。
  messages.forEach((message, index) => {
    for (const [workflowId, anchor] of anchorIndex) {
      if (anchor !== index) continue;
      const bucket = buckets.get(workflowId)!;
      items.push({
        kind: "workflow",
        workflowId,
        workflow: workflowById.get(workflowId) ?? null,
        stepLogMessages: bucket.stepLogMessages,
        actionMessages: bucket.actionMessages,
      });
      emitted.add(workflowId);
    }

    const isAssistant = message.role === "assistant";
    const isAction = isWorkflowActionMessage(message);
    if (message.workflowId && (isAssistant || isAction)) return;
    items.push({ kind: "message", message });
  });

  // 第三遍：没有关联消息的 workflow（如初始 plan 等待态），追加为 Workflow Message。
  for (const workflow of workflows) {
    if (emitted.has(workflow.id)) continue;
    const bucket = buckets.get(workflow.id);
    items.push({
      kind: "workflow",
      workflowId: workflow.id,
      workflow,
      stepLogMessages: bucket?.stepLogMessages ?? [],
      actionMessages: bucket?.actionMessages ?? [],
    });
  }

  return items;
}

/**
 * 选择「当前活跃」的 workflow：
 * 优先取未结束（非 completed/failed/cancelled）的第一个，否则回退到最近一个。
 */
export function findActiveWorkflow(workflows: AgentWorkflowDetailDto[]): AgentWorkflowDetailDto | null {
  return workflows.find((workflow) => !["completed", "failed", "cancelled"].includes(workflow.status))
    ?? workflows[0]
    ?? null;
}

/** 返回按 sequence 排序的 step 列表（不修改原数组）。 */
export function orderedSteps(workflow: AgentWorkflowDetailDto | null): WorkflowStepDto[] {
  if (!workflow) return [];
  return [...workflow.steps].sort((a, b) => a.sequence - b.sequence);
}

/** 返回某 workflow 下指定 kind 的最新 artifact（按 version 取最大）。 */
export function latestArtifact(
  workflow: AgentWorkflowDetailDto | null,
  kind: WorkflowArtifactKind,
): WorkflowArtifactDto | null {
  return workflow?.artifacts
    .filter((artifact) => artifact.kind === kind)
    .sort((a, b) => b.version - a.version)
    .at(0) ?? null;
}

/** 将 Workflow Step 状态映射为视觉状态。 */
export function stepVisualState(status: WorkflowStepStatus): StepVisualState {
  if (status === "completed" || status === "confirmed") return "done";
  if (status === "running") return "active";
  if (status === "awaiting_confirmation") return "waiting";
  if (status === "failed") return "error";
  if (status === "skipped") return "skipped";
  return "pending";
}

/** 生成 WorkflowAction 反馈的可读标签（用于折叠摘要）。 */
export function workflowActionFeedbackLabel(message: MessageDto): string {
  const action = (message.metadata as { workflowAction?: string } | undefined)?.workflowAction;
  const payload = (message.metadata as { payload?: { selectedOption?: WorkflowDecisionOption } } | undefined)?.payload;
  switch (action) {
    case "submit_clarification":
      return "已提交补充信息";
    case "submit_decision":
      if (payload?.selectedOption === "confirm") return "已确认方案";
      if (payload?.selectedOption === "reject") return "已拒绝方案";
      if (payload?.selectedOption === "revise") return "已提交修改意见";
      return "已提交决策";
    case "retry_step":
      return "已重试失败步骤";
    case "cancel":
      return "已取消 Workflow";
    default:
      return "已提交";
  }
}

/** 返回 decision 三选一选项的可读标签。 */
export function decisionOptionLabel(option: WorkflowDecisionOption): string {
  if (option === "confirm") return "确认";
  if (option === "revise") return "修改";
  return "拒绝";
}

/** 返回 Workflow Step 类型的可读标签（用于步骤日志）。 */
export function stepTypeLabel(stepType: WorkflowStepType): string {
  return WORKFLOW_STEP_SEQUENCE.find((item) => item.type === stepType)?.label ?? stepType;
}

/** 判断当前是否应展示内联 Clarification Form。 */
export function shouldShowClarificationForm(
  step: WorkflowStepDto | null,
  clarification: WorkflowArtifactDto | null,
): boolean {
  return Boolean(
    clarification &&
    step?.type === "plan" &&
    step.status === "awaiting_confirmation" &&
    step.stageState === "awaiting_clarification" &&
    clarification.workflowStepId === step.id,
  );
}

/** 判断当前是否应展示内联 Decision Form。 */
export function shouldShowDecisionForm(
  step: WorkflowStepDto | null,
  decision: WorkflowArtifactDto | null,
): boolean {
  return Boolean(
    decision &&
    step?.status === "awaiting_confirmation" &&
    ["awaiting_plan_confirmation", "awaiting_preview_confirmation"].includes(step.stageState ?? "") &&
    decision.workflowStepId === step.id,
  );
}

/** 判断 Clarification Form 是否满足提交条件（所有必填项已填）。 */
export function canSubmitClarification(
  fields: ClarificationField[],
  answers: Record<string, string | string[] | null>,
): boolean {
  return fields.every((field) => {
    if (!field.required) return true;
    const value = answers[field.id];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value?.trim());
  });
}

/** 判断 Decision Form 是否满足提交条件（revise 必须填写意见）。 */
export function canSubmitDecision(
  selectedOption: WorkflowDecisionOption | null,
  comment: string,
): boolean {
  if (!selectedOption) return false;
  if (selectedOption === "revise") return comment.trim().length > 0;
  return true;
}

/** 将 Clarification 字段的 options 归一化为 naive-ui 所需的 { label, value }。 */
export function fieldOptions(field: ClarificationField): Array<{ label: string; value: string }> {
  return (field.options ?? []).map((option) => {
    const value = option.value ?? option.id ?? option.label ?? "";
    return { label: option.label ?? value, value };
  });
}

/** 步骤日志中一条消息的动作标签信息。 */
export interface StepLogAction {
  /** 动作种类：工具调用 / 产出草稿 / 无（最终结果或普通消息） */
  kind: "tool" | "produce" | null;
  /** 标签文本（如工具名或产物类型） */
  label: string;
}

/**
 * 从一条 assistant 消息的 metadata 中提取步骤动作标签。
 *
 * agent_status 过程消息带 trace 标记并携带 actionType/toolName/finalKind；
 * chat 消息（如 commit 的「已提交 Candidate A2UI」）无 trace 标记，返回 null。
 */
export function stepLogAction(message: MessageDto): StepLogAction {
  const metadata = message.metadata as {
    trace?: unknown;
    actionType?: unknown;
    toolName?: unknown;
    finalKind?: unknown;
  };
  if (metadata.trace !== true) return { kind: null, label: "" };
  if (metadata.actionType === "tool_call" && typeof metadata.toolName === "string" && metadata.toolName) {
    return { kind: "tool", label: metadata.toolName };
  }
  if (metadata.actionType === "final_draft" && typeof metadata.finalKind === "string" && metadata.finalKind) {
    return { kind: "produce", label: metadata.finalKind };
  }
  return { kind: null, label: "" };
}

/** Workflow Message 内部事件时间线的一个节点。 */
export type TimelineNode =
  | { kind: "agent"; message: MessageDto; at: string }
  | { kind: "artifact"; artifact: WorkflowArtifactDto; at: string }
  | { kind: "user-action"; message: MessageDto; at: string };

/**
 * 构建 Workflow Message 内部的事件时间线。
 *
 * 将 agent 过程消息、artifact 产出、用户动作三路数据按 createdAt 合并排序，
 * 保留工具调用与结果输出的先后关系。当前等待中的表单 artifact 由 waitingArtifactIds
 * 排除（它们单独渲染在时间线末尾，避免既作历史节点又作等待节点）。
 */
export function buildWorkflowTimeline(
  workflow: AgentWorkflowDetailDto | null,
  stepLogMessages: MessageDto[],
  actionMessages: MessageDto[],
  waitingArtifactIds: ReadonlySet<string>,
): TimelineNode[] {
  const nodes: TimelineNode[] = [];

  for (const message of stepLogMessages) {
    nodes.push({ kind: "agent", message, at: message.createdAt });
  }
  for (const message of actionMessages) {
    nodes.push({ kind: "user-action", message, at: message.createdAt });
  }
  if (workflow) {
    for (const artifact of workflow.artifacts) {
      if (waitingArtifactIds.has(artifact.id)) continue;
      nodes.push({ kind: "artifact", artifact, at: artifact.createdAt });
    }
  }

  nodes.sort((a, b) => a.at.localeCompare(b.at));
  return nodes;
}

/** 用户动作节点的一条明细（标签 + 值）。 */
export interface ActionDetail {
  label: string;
  value: string;
}

/**
 * 提取 WorkflowAction 用户消息的展开明细（供「可展开看明细」）。
 *
 * - submit_clarification：answers 各字段 + additionalText
 * - submit_decision revise：修改意见
 * - 其余（confirm / reject / retry / cancel）：无明细
 */
export function workflowActionDetails(message: MessageDto): ActionDetail[] {
  const metadata = message.metadata as {
    workflowAction?: string;
    payload?: {
      answers?: Record<string, unknown>;
      additionalText?: string;
      selectedOption?: string;
      comment?: string;
    };
  };
  const payload = metadata.payload ?? {};

  switch (metadata.workflowAction) {
    case "submit_clarification": {
      const details: ActionDetail[] = [];
      const answers = payload.answers;
      if (answers && typeof answers === "object") {
        for (const [key, value] of Object.entries(answers)) {
          details.push({ label: key, value: formatAnswerValue(value) });
        }
      }
      if (payload.additionalText?.trim()) {
        details.push({ label: "补充说明", value: payload.additionalText.trim() });
      }
      return details;
    }
    case "submit_decision": {
      if (payload.selectedOption === "revise" && payload.comment?.trim()) {
        return [{ label: "修改意见", value: payload.comment.trim() }];
      }
      return [];
    }
    default:
      return [];
  }
}

/** 将澄清答案的值格式化为可读文本。 */
function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join("、");
  if (value == null || value === "") return "—";
  return String(value);
}

/** artifact 时间线节点的展示信息。 */
export interface ArtifactDisplay {
  title: string;
  tag: string;
  tagType: "default" | "success" | "error" | "info" | "warning";
  /** 紧凑摘要行（默认收起时展示）。 */
  summary: string;
  /** 展开后展示的详情文本。 */
  details: string;
}

/**
 * 将 artifact 归一化为时间线节点的展示信息。
 *
 * plan / validation 用 contentText 作详情；clarification / decision 是「提问」，
 * 从 contentJson 提取标题、描述与字段/选项；candidate 只给摘要（恢复预览另走按钮）。
 */
export function artifactDisplay(artifact: WorkflowArtifactDto): ArtifactDisplay {
  switch (artifact.kind) {
    case "plan_markdown": {
      const text = artifact.contentText ?? "";
      return {
        title: `Markdown Plan v${artifact.version}`,
        tag: "plan_markdown",
        tagType: "success",
        summary: text.slice(0, 120),
        details: text,
      };
    }
    case "validation_report": {
      const valid = artifact.contentJson.valid === true;
      return {
        title: `Validation Report v${artifact.version}`,
        tag: "validation_report",
        tagType: valid ? "success" : "error",
        summary: valid ? "校验通过" : "校验存在错误",
        details: artifact.contentText ?? "",
      };
    }
    case "clarification_form": {
      const content = artifact.contentJson as { title?: string; description?: string; fields?: unknown };
      const fields = Array.isArray(content.fields)
        ? (content.fields as Array<{ id?: string; label?: string }>)
        : [];
      const fieldLines = fields.map((field) => `- ${field.label ?? field.id ?? ""}`).join("\n");
      return {
        title: content.title ?? "补充需求",
        tag: "askClarification",
        tagType: "info",
        summary: content.description ?? "请补充以下信息。",
        details: fieldLines,
      };
    }
    case "decision_form": {
      const content = artifact.contentJson as { title?: string; prompt?: string; options?: unknown };
      const options = Array.isArray(content.options)
        ? (content.options as Array<{ id?: string; label?: string; description?: string }>)
        : [];
      const optionLines = options
        .map((option) => `- ${option.label ?? option.id ?? ""}${option.description ? `：${option.description}` : ""}`)
        .join("\n");
      return {
        title: content.title ?? "确认",
        tag: "askUserDecision",
        tagType: "info",
        summary: content.prompt ?? "",
        details: optionLines,
      };
    }
    case "candidate_a2ui_messages": {
      const content = artifact.contentJson as { messages?: unknown };
      const count = Array.isArray(content.messages) ? content.messages.length : 0;
      return {
        title: `Candidate A2UI v${artifact.version}`,
        tag: "candidate_a2ui_messages",
        tagType: "success",
        summary: `${count} 条 A2UI messages`,
        details: "",
      };
    }
  }
}
