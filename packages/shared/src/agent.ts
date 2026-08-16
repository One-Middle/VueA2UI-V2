/**
 * Agent 相关的共享类型定义。
 *
 * 职责：
 * - 定义 Agent 运行输入/输出类型（AgentRunInput、AgentRunResult）
 * - 定义 A2UI 校验相关类型（ValidateA2UIInput、ValidateA2UIResult、ValidationIssue）
 * - 定义工具调用记录类型（ToolCallRecord）
 *
 * 不负责：具体的校验逻辑、模型调用、上下文构建。
 */

import type { A2UIServerMessage, JsonObject, SurfaceSnapshotData } from "./a2ui";
import type {
  AgentRunTraceSummaryDto,
  AgentTraceEventDto,
  SkillReference,
  WorkflowDecisionOption,
  WorkflowStageState,
  WorkflowStepType,
} from "./api";
import type { ResourceLedgerSnapshot } from "./resource-ledger";
import type { AgentRunPhase } from "./sse";

/** A2UI 校验过程中发现的单个问题。 */
export interface ValidationIssue {
  /** 问题代码，如 A2UI_STRUCTURE、CATALOG_PROPERTY */
  code: string;
  /** JSON 路径，指向问题所在位置 */
  path?: string;
  /** 人类可读的问题描述 */
  message: string;
}

/** validateA2UI 工具的输入参数。 */
export interface ValidateA2UIInput {
  /** 待校验的 A2UI 服务端消息列表 */
  messages: A2UIServerMessage[];
  /** 使用的 Catalog ID */
  catalogId: string;
  /** 当前 Surface 快照（可选），用于增量校验 */
  currentSnapshot?: SurfaceSnapshotData | null;
}

/** validateA2UI 工具的返回结果。 */
export interface ValidateA2UIResult {
  /** 是否通过校验 */
  valid: boolean;
  /** 校验错误列表 */
  errors: ValidationIssue[];
  /** 校验警告列表 */
  warnings: ValidationIssue[];
  /** 校验通过时返回的规范化消息列表 */
  normalizedMessages: A2UIServerMessage[];
}

/** Agent 运行输入参数，由后端在触发 Agent Run 时组装。 */
export interface AgentRunInput {
  /** 会话 ID */
  sessionId: string;
  /** 用户输入的文本消息 */
  userMessage: string;
  /** 最近的对话历史消息 */
  recentMessages: Array<{ role: string; content: string }>;
  /** 用户上传的文件列表（含文件内容） */
  uploadedFiles: Array<{ id: string; originalName: string; content: string }>;
  /** 已启用的 Skill 列表 */
  enabledSkills: Array<{
    id: string;
    name: string;
    description?: string | null;
    content: string;
    sourceType?: string | null;
    metadata?: JsonObject | null;
    references?: SkillReference[];
  }>;
  /** 当前 Surface 快照数据，用于增量更新 */
  currentSnapshot: SurfaceSnapshotData | null;
  /** 使用的 Catalog ID */
  catalogId: string;
  /** Catalog 版本 */
  catalogVersion: string;
  /** Renderer 版本 */
  rendererVersion: string;
  /** 模型配置 */
  model: {
    provider: string;
    name: string;
    config: JsonObject;
  };
}

/** Workflow task 执行入口的上下文快照。 */
export interface AgentWorkflowTaskInput extends AgentRunInput {
  /** 当前 Workflow 所处 gate。 */
  gate: WorkflowStepType;
  /** 当前 Workflow Step 类型。 */
  stepType?: WorkflowStepType;
  /** 当前 Workflow Step 的领域等待态。 */
  stageState?: WorkflowStageState;
  /** Workflow ID，用于 debug metadata 和审计关联。 */
  workflowId: string;
  /** Workflow step ID，用于 debug metadata 和审计关联。 */
  workflowStepId: string;
  /** 持久化的 AgentRun ID，用于 trace event 关联（backend 创建 run 后回填）。 */
  agentRunId?: string;
  /** 当前 task 的类型。 */
  task:
    | "plan"
    | "revise_plan"
    | "generate_a2ui"
    | "validate"
    | "preview_decision"
    | "initial_planning"
    | "generate_candidate";
  /** 当前 gate 允许 Agent 看见和调用的工具集合。 */
  availableTools?: AgentToolName[];
  /** 用户提交的澄清答案。 */
  clarificationAnswers?: JsonObject;
  /** 已确认或最近生成的 Markdown plan。 */
  previousPlanMarkdown?: string | null;
  /** 最近通过 validate 的 Candidate A2UI 摘要或完整内容。 */
  previousCandidate?: JsonObject | null;
  /** 用户针对上一版 plan 的修改意见。 */
  revisionText?: string | null;
  /** 历史 candidate 或额外 workflow artifact 摘要。 */
  workflowContext?: JsonObject;
  /** 上一 task 遗留的 Resource Ledger Snapshot，运行前由 Runtime hydrate 恢复正文。 */
  resourceLedger?: ResourceLedgerSnapshot;
}

/** Workflow 内 Agent 可以调用的受控工具名称。 */
export type AgentToolName =
  | "askClarification"
  | "askUserDecision"
  | "getSkillContent"
  | "getSkillReferenceContent"
  | "getCatalogComponentDetails"
  | "validateA2UI";

/** Clarification Form 支持的问题类型。 */
export type ClarificationQuestionType = "select" | "radio" | "checkbox" | "text" | "textarea";

/** Clarification Form 选项。 */
export interface ClarificationOption {
  label: string;
  value: string;
}

/** Runtime 解析后的澄清问题。 */
export interface ClarificationQuestion {
  id: string;
  label: string;
  type: ClarificationQuestionType;
  required: boolean;
  reason: string;
  options?: ClarificationOption[];
  placeholder?: string;
}

/** Runtime 解析后的澄清表单。 */
export interface ClarificationForm {
  title?: string;
  description?: string;
  fields: ClarificationQuestion[];
}

/** Decision Form 目标 artifact 类型。 */
export type DecisionFormTarget = "plan_markdown" | "candidate_a2ui_messages";

/** Decision Form 三选一选项。 */
export interface DecisionFormOption {
  id: WorkflowDecisionOption;
  label: string;
  description?: string;
}

/** Runtime 解析后的用户决策表单。 */
export interface DecisionForm {
  title: string;
  prompt: string;
  guidance: string;
  target: DecisionFormTarget;
  targetArtifactId?: string;
  options: DecisionFormOption[];
}

/** Agent Runtime 解析、归一化、校验后的 workflow 结果。 */
export type ParsedAgentResult =
  | {
      kind: "clarification_request";
      form: ClarificationForm;
    }
  | {
      kind: "plan_markdown";
      markdown: string;
      decisionForm: DecisionForm;
    }
  | {
      kind: "candidate_a2ui_messages";
      messages: A2UIServerMessage[];
      assistantMessage?: string;
    }
  | {
      kind: "decision_form";
      form: DecisionForm;
    }
  | {
      kind: "failure";
      reason: string;
      recoverable: boolean;
      details?: JsonObject;
    };

/** Workflow task 执行结果，raw output 只能作为 debug 摘要出现。 */
export interface AgentWorkflowTaskResult {
  parsedResult: ParsedAgentResult;
  debugMetadata: JsonObject;
  toolCalls: ToolCallRecord[];
  rawOutputPreview: string;
  attemptCount: number;
  tokenUsage?: JsonObject;
  /** ReAct 循环 trace 摘要，由 backend 写入 agent_runs.metadata.traceSummary。 */
  traceSummary?: AgentRunTraceSummaryDto;
  /** 本次 task 结束后的 Resource Ledger Snapshot，由 backend 写回 AgentWorkflow metadata。 */
  resourceLedger?: ResourceLedgerSnapshot;
}

/** Agent 运行结果，包含三种状态：已提交、纯文本、失败。 */
export type AgentRunResult =
  | {
      /** 状态：校验通过并已提交 */
      status: "COMMITTED";
      /** AI 辅助回复文本 */
      assistantMessage: string;
      /** 提交的 A2UI 消息列表 */
      a2uiMessages: A2UIServerMessage[];
      /** 尝试次数（含修复轮次） */
      attemptCount: number;
      /** 最终校验结果 */
      validation: ValidateA2UIResult;
      /** Token 用量统计 */
      tokenUsage?: JsonObject;
    }
  | {
      /** 状态：纯文本回复（无 A2UI 消息） */
      status: "TEXT_ONLY";
      /** AI 回复文本 */
      assistantMessage: string;
      /** 无 A2UI 消息时为空数组 */
      a2uiMessages: [];
      /** 尝试次数 */
      attemptCount: number;
      /** Token 用量统计 */
      tokenUsage?: JsonObject;
    }
  | {
      /** 状态：运行失败 */
      status: "FAILED";
      /** AI 最后一条回复文本 */
      assistantMessage: string;
      /** 尝试次数（含修复轮次） */
      attemptCount: number;
      /** 失败时的校验结果（可选） */
      validation?: ValidateA2UIResult;
      /** 失败原因描述 */
      failureReason: string;
    };

/** Agent 运行过程中的单次工具调用记录。 */
export interface ToolCallRecord {
  /** Runtime 生成的工具调用关联 ID，持久化后可映射到数据库 tool call ID。 */
  toolCallId?: string;
  /** 工具名称 */
  toolName: string;
  /** 调用状态 */
  status: "running" | "succeeded" | "failed";
  /** 所在尝试轮次索引 */
  attemptIndex: number;
  /** Agent 运行阶段，用于 SSE 向前端展示当前工具调用属于哪个阶段 */
  phase?: AgentRunPhase;
  /** 输入摘要（脱敏后的关键参数） */
  inputSummary: JsonObject;
  /** 输出结果（脱敏后） */
  output?: JsonObject;
  /** 失败时的错误信息 */
  errorMessage?: string;
  /** 调用耗时（毫秒） */
  durationMs?: number;
}

/**
 * Agent Runtime 接口。
 * 任何 Agent 实现只需实现此接口即可被后端无缝调用。
 */
export interface IAgentRuntime {
  run(
    input: AgentRunInput,
    onToolCall?: (record: ToolCallRecord) => void,
  ): Promise<AgentRunResult>;

  runWorkflowTask(
    input: AgentWorkflowTaskInput,
    onToolCall?: (record: ToolCallRecord) => void,
    onTraceEvent?: (event: AgentTraceEventDto) => void,
  ): Promise<AgentWorkflowTaskResult>;
}

/**
 * Agent Runtime 工厂配置。
 * 包含模型 API 连接所需的最少参数，与具体模型客户端无关。
 */
export interface AgentRuntimeFactoryConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

/**
 * Agent Runtime 工厂函数签名。
 * 后端持有此类型的引用，不必知道 Agent 内部组装细节。
 */
export type AgentRuntimeFactory = (
  config: AgentRuntimeFactoryConfig,
) => IAgentRuntime;
