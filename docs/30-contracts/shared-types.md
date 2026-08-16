# Shared 类型契约

## 1. 定位

`packages/shared` 是跨模块类型的唯一来源。API DTO、A2UI message、SSE event、Agent result、validation result 等跨模块类型应优先放入这里。

## 2. 文件划分

- `packages/shared/src/a2ui.ts`：A2UI v0.9 message、component、surface、Catalog 相关类型。
- `packages/shared/src/api.ts`：HTTP API request/response DTO。
- `packages/shared/src/agent.ts`：Agent 输入、结果、校验、tool call 类型。
- `packages/shared/src/resource-ledger.ts`：Resource Ledger Snapshot 契约，跨 workflow task 共享已披露 Skill / Reference 的元信息。
- `packages/shared/src/sse.ts`：SSE event 类型。
- `packages/shared/src/logger.ts`：共享日志类型或工具。
- `packages/shared/src/index.ts`：统一导出入口。

## 3. 依赖规则

- `shared` 不依赖 `frontend`、`renderer`、`backend`、`agent`。
- 业务模块可以依赖 `shared`。
- 跨模块字段变更必须先修改 `shared`，再修改调用方。
- 不允许在多个模块重复定义 Session、Message、A2UIEvent、SurfaceSnapshot、SSEEvent、AgentResult 等 DTO。

## 3.1 Agent Workflow 共享字段

- `AgentWorkflowDto` 描述 session 内一次可恢复 Agent Workflow 的状态、当前 step、意图、完成/失败原因和时间戳。
- `WorkflowStepDto` 描述 workflow 中的可观测阶段，`type` 只能是 `plan`、`generate_a2ui`、`validate`、`preview` 或 `commit`。
- `WorkflowStepDto.status` 描述通用执行状态，集合为 `pending`、`running`、`awaiting_confirmation`、`confirmed`、`completed`、`failed` 和 `skipped`。
- `WorkflowStepDto.stageState` 描述领域等待态，集合为 `awaiting_clarification`、`awaiting_plan_confirmation`、`awaiting_preview_confirmation` 或 `null`。该字段是主状态字段，不放入 `metadata`（`workflow_steps.stage_state` 是其持久化列）。
- `WorkflowArtifactDto` 描述 workflow 产物，`kind` 包含 `clarification_form`、`decision_form`、`plan_markdown`、`candidate_a2ui_messages` 和 `validation_report`。
- `MessageDto` 和 `AgentRunDto` 包含可选 `workflowId` 与 `workflowStepId`，用于恢复完整 workflow timeline。
- `WorkflowActionRequest` 和 `WorkflowActionResponse` 是前端推进 workflow 的通用 action 契约。当前 action 集合为 `submit_clarification`、`submit_decision`、`retry_step` 和 `cancel`。
- `PlatformSseEvent` 包含 workflow 级事件：`workflow_started`、`workflow_step_updated`、`workflow_artifact_created`、`workflow_completed`、`workflow_failed`，以及 ReAct 循环实时事件 `agent_trace_event`。
- `AgentWorkflowTaskInput` 是 workflow task 执行入口的上下文快照，`task` 联合为 `plan`、`revise_plan`、`generate_a2ui`、`validate`、`preview_decision`、`initial_planning`、`generate_candidate`；后端实际只使用 `plan`、`revise_plan`、`generate_a2ui`、`preview_decision` 四种。它还携带 `availableTools`、`resourceLedger`、`agentRunId`、`clarificationAnswers`、`previousPlanMarkdown`、`previousCandidate`、`revisionText` 等跨 task 上下文。
- `AgentToolName` 是 workflow 内 Agent 可调用的受控工具集合：`askClarification`、`askUserDecision`、`getSkillContent`、`getSkillReferenceContent`、`getCatalogComponentDetails`、`validateA2UI`。
- `AgentWorkflowTaskResult` 是 workflow task 的执行结果，包含 `parsedResult`、`debugMetadata`、`toolCalls`、`rawOutputPreview`、`attemptCount`、`tokenUsage`、`traceSummary` 和 `resourceLedger`。
- `AgentTraceEventDto` 与 `AgentRunTraceSummaryDto` 描述 ReAct 循环的实时 trace 事件与持久化摘要；trace 事件由 backend 零转换转发为 `agent_trace_event` SSE，摘要写入 `agent_runs.metadata.traceSummary`。

### WorkflowStepType

```ts
export type WorkflowStepType =
  | "plan"
  | "generate_a2ui"
  | "validate"
  | "preview"
  | "commit";
```

### WorkflowStageState

```ts
export type WorkflowStageState =
  | "awaiting_clarification"
  | "awaiting_plan_confirmation"
  | "awaiting_preview_confirmation"
  | null;
```

### WorkflowArtifactKind

```ts
export type WorkflowArtifactKind =
  | "clarification_form"
  | "decision_form"
  | "plan_markdown"
  | "candidate_a2ui_messages"
  | "validation_report";
```

### WorkflowActionType

```ts
export type WorkflowActionType =
  | "submit_clarification"
  | "submit_decision"
  | "retry_step"
  | "cancel";
```

`submit_clarification` payload：

```ts
{
  action: "submit_clarification";
  artifactId: string;
  payload: {
    answers: Record<string, unknown>;
    additionalText?: string;
  };
}
```

`submit_decision` payload：

```ts
{
  action: "submit_decision";
  artifactId: string;
  payload: {
    selectedOption: "confirm" | "revise" | "reject";
    comment?: string;
  };
}
```

约束：

- `confirm` 不允许携带 comment。
- `revise` 必须携带非空 comment。
- `reject` 不要求 comment，后端记录用户 message 后停留在当前等待态。
- `clarification_form` 收集信息，`decision_form` 做三选一决策，两者 action 和 payload 必须拆分。

### ParsedAgentResult

Agent Runtime 将 raw Agent Output 解析为内部结构化 union。它不是 API Output，也不要求 Agent 直接输出 JSON。

```ts
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
```

### ClarificationForm

Clarification Form 由 `askClarification` 生成，负责收集信息，不负责确认产物。

字段要求：

- 每个问题必须有 `id`、`label`、`type`、`required`、`reason`。
- `type` 支持 `select`、`radio`、`checkbox`、`text`、`textarea`。
- 选择类问题必须有 `options`。
- 前端额外提供自然语言输入框，对应 `additionalText`。

### DecisionForm

Decision Form 由 `askUserDecision` 生成，只有工具实际被调用时前端才展示特殊 UI block。

```ts
export interface DecisionForm {
  title: string;
  prompt: string;
  guidance: string;
  target: "plan_markdown" | "candidate_a2ui_messages";
  targetArtifactId?: string;
  options: Array<{
    id: "confirm" | "revise" | "reject";
    label: string;
    description?: string;
  }>;
}
```

同一次 Agent run 生成 `plan_markdown + decision_form` 时，Runtime 尚不知道 artifact id。WorkflowService 创建 `plan_markdown` artifact 后，再创建 `decision_form` artifact，并回填 `targetArtifactId`。

`decision_form.metadata` 至少包含：

```ts
{
  source: "askUserDecision";
  agentRunId: string;
  toolCallId: string;
}
```

## 3.2 Agent Runtime 共享字段

- `AgentRunInput.enabledSkills` 包含 `id`、`name`、`description`、`content` 和可选 `references`；普通 `run()` 路径的初始 Prompt 只暴露 Skill 摘要和 Reference 摘要，完整内容按需披露。
- `SkillReference` 包含 `id`、`title`、`content` 和可选 `description`，表示隶属于单个 Skill 的参考资料正文。
- `ToolCallRecord.phase` 用于标记工具调用所属阶段，后端 SSE 会将该阶段透传给前端。
- `IAgentRuntime` 接口定义两个入口：普通生成 `run(input, onToolCall?) → AgentRunResult`，以及 workflow 入口 `runWorkflowTask(input, onToolCall?, onTraceEvent?) → AgentWorkflowTaskResult`。后端只依赖此接口，不感知具体实现。
- `AgentRuntimeFactoryConfig` 定义工厂函数所需的最小配置（模型 API 连接参数），与具体模型客户端实现无关。
- `AgentRuntimeFactory` 是工厂函数签名，后端持有此类型引用；替换 Agent 实现只需换一行 import。
- `ResourceLedgerSnapshot`（`resource-ledger.ts`）只保存已披露资源的键与元信息（`skill:<skillId>`、`reference:<skillId>:<referenceId>`），不保存正文；正文在每次 workflow task 运行前由 Agent Runtime 依据 `enabledSkills` 重新 hydrate。该 snapshot 存于 `AgentWorkflow.metadata.resourceLedger`，跨 task 共享已披露资源并做披露去重。

## 3.3 Model IO Logging 契约

Model IO Logging（模型输入输出日志）是本地开发诊断契约，不属于 HTTP API、SSE、数据库 schema 或用户可见 artifact 契约。

### 开关

```ts
export type ModelIOLogMode = "off" | "summary" | "debug" | "full";
```

环境变量：

```env
MODEL_IO_LOG=off
```

语义：

- `off`：不输出模型输入输出日志。
- `summary`：后端终端输出模型调用摘要。
- `debug`：后端终端输出摘要和截断后的输入输出预览。
- `full`：后端终端输出摘要，并写入脱敏后的完整 JSONL trace。

`MODEL_IO_LOG` 只控制模型输入输出日志；普通应用日志仍由 `LOG_LEVEL` 控制。

### Trace Context

`traceContext` 是模型调用的可选诊断上下文。缺失字段必须按 `null` 处理，不得导致模型调用失败。

```ts
export interface ModelTraceContext {
  sessionId?: string | null;
  agentRunId?: string | null;
  workflowId?: string | null;
  workflowStepId?: string | null;
  task?: string | null;
  phase?: string | null;
  attempt?: number | null;
  round?: number | null;
}
```

建议 `phase` 值：

- `initial_generation`
- `repair`
- `workflow_task`
- `progressive_disclosure`

### JSONL Trace

`full` 模式写入 `logs/model-io/YYYY-MM-DD.jsonl`。每一行表示一次模型调用，必须包含同一个 `requestId`，用于从终端日志定位到 JSONL 记录。

```ts
export interface ModelIOTraceRecord {
  requestId: string;
  timestamp: string;
  model: string;
  traceContext: Required<ModelTraceContext>;
  request: {
    messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
    messageCount: number;
    roleStats: Record<string, { count: number; chars: number }>;
  };
  response: null | {
    content: string;
    chars: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  durationMs: number;
  error: null | {
    message: string;
    stack?: string;
  };
}
```

脱敏约束：

- `full` 模式写入 JSONL 前必须做基础密钥脱敏。
- 至少脱敏 `Authorization: Bearer ...`、`Bearer ...`、`sk-...`、`apiKey`、`api_key`、`authorization`、`Authorization` 以及 `.env` 风格的 `KEY`、`TOKEN`、`SECRET` 字段。
- JSONL 文件只用于本地开发排查，不得提交到版本库。

### 原始追写（AGENT_ROUND_DUMP）

`AGENT_ROUND_DUMP` 是独立的本地诊断开关，与 `MODEL_IO_LOG` 相互独立：即使 `MODEL_IO_LOG=off`，只要该开关开启也会追写。

```env
AGENT_ROUND_DUMP=1
```

语义：

- 取值 `1` / `true` / `on` / `yes`（大小写不敏感）视为开启，其余视为关闭。
- 每次模型调用完成后，把原始 `messages` 与原始回复追写一段到会话级纯文本文件 `logs/agent-io/<sessionId>.txt`（`sessionId` 缺失时写入 `unknown.txt`）。
- 该追写只做原样记录与基础密钥脱敏，不做统计或截断；写文件失败只告警，不影响模型调用主流程。
- `logs/agent-io/` 与 `logs/model-io/` 一样只用于本地开发排查，不得提交到版本库。

## 4. 维护规则

- 新增类型时，为 export 类型和接口补充中文 JSDoc。
- 修改 API DTO 时，同步 `docs/30-contracts/api.md`。
- 修改 A2UI 类型时，同步 `docs/30-contracts/a2ui-v0.9.md`。
- 修改 Agent result 或 validation 类型时，同步 `docs/40-implementation/modules/agent/README.md` 与相关后端提交逻辑。

