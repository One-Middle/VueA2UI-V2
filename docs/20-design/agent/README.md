# ReAct Agent Adapter 模块边界

`packages/agent`

定位：当前默认的 ReAct Engine Adapter。它实现 Agent Engine SPI，并将 ReAct loop、OpenAI-compatible 模型调用和 ReAct 私有状态封装在 adapter 内部。

## 模块功能

把平台提供的通用 Agent 任务转化为可执行的 ReAct 循环：编排 prompt 与模型调用，按需读取上下文或调用 capability，依据校验结果修复草稿，并将 ReAct 私有过程映射回 SPI 的结构化结果和语义事件。

## 负责

- 根据 SPI request 的任务、材料和能力目录构建 ReAct prompt。
- 调用 OpenAI-compatible API。
- 以 ReAct 循环（think → act → observe）执行 task，并通过 SPI host 按需读取上下文、调用 capability 和发送事件。
- 维护 ReAct 私有的资源披露、观察、草稿修复与 continuation。
- 按 task outputSchema 返回通用结构化 outcome、contextUsed、统一失败和诊断。

## 不负责

- 直接写数据库。
- 直接提交正式 A2UI event 或 surface snapshot。
- 决定 workflow 状态、用户确认或正式提交。
- 开放 HTTP API。
- 前端渲染或会话 UI。

## 边界

- 仅依赖 Agent Engine SPI 和 ReAct 自身运行时组件；不依赖 Workflow、A2UI、Prisma、SSE 或 backend 服务。
- 由平台通过 SPI 静态注册并调用。
- 平台负责将通用 outcome 校验、映射为业务 artifact 并决定 gate 合法性。
- ReAct 原始 trace 作为 adapter 诊断透传，平台不依赖其私有字段驱动业务。

## ReAct 私有输出协议

ReAct adapter 内部，模型每轮只能输出单个 ReAct action envelope：

- `tool_call`：调用当前 request 暴露的 capability 或上下文读取能力。
- `final_draft`：提交当前 task 的最终草稿。
- `give_up`：声明无法继续，并标记是否可恢复。

该格式不属于 SPI。adapter 将其转换为 task outputSchema 所要求的通用 JSON outcome；平台不消费 ReAct action envelope。

生成候选 A2UI 时，现有 ReAct 私有草稿形状为：

```json
{
  "type": "final_draft",
  "reasoningSummary": "生成候选 A2UI",
  "finalKind": "candidate_a2ui_messages",
  "draft": {
    "assistantMessage": "说明文本",
    "messages": []
  }
}
```

普通非 workflow 路径属于旧兼容入口；新引擎路径统一使用 SPI request 与 outputSchema。

## Catalog Context

`getCatalogComponentDetails` 获取到的组件详情属于生成约束，不属于时间线观察。PromptComposer 应将已披露组件规范放入独立的 Catalog Context 分区；Observations 只保留工具执行摘要，例如“已获取组件详情：Text、TextField”。

Catalog Context 应面向模型修复：

- 按组件分组列出允许字段、必填字段、枚举值和动态绑定形状。
- 明确常见禁止字段，例如 `Text` 不使用 `label` / `value`，`TextField` 使用 `text` 而不是 `value`。
- 给出局部修复提示，帮助模型根据 `validateA2UI` 错误改当前 draft，而不是重新生成整份 UI。

## Model IO Logging 设计

Model IO Logging（模型输入输出日志）是 Agent 模块的本地开发诊断能力，目标是让开发者在后端终端和本地 JSONL trace 文件中查看模型调用的输入、输出、耗时和 token 用量。

设计边界：

- 日志入口放在 `ModelClient.generate()`，覆盖普通 `run()`、Workflow `runWorkflowTask()` 和渐进披露等所有模型调用路径。
- 日志由 `MODEL_IO_LOG=off|summary|debug|full` 控制，和普通 `LOG_LEVEL` 分离。
- `summary` 只输出终端摘要；`debug` 输出截断后的 prompt / response 预览；`full` 额外写入 `logs/model-io/YYYY-MM-DD.jsonl`。
- `AGENT_ROUND_DUMP=1|true|on|yes` 是独立开关：每次模型调用后把原始 messages 与原始回复追写到 `logs/agent-io/<sessionId>.txt`，与 `MODEL_IO_LOG` 相互独立。
- 每次模型调用生成一个 `requestId`，终端日志和 JSONL 记录共用该 ID。
- `traceContext` 显式传入，可包含 `sessionId`、`agentRunId`、`workflowId`、`workflowStepId`、`task`、`phase`、`attempt` 和 `round`；缺失字段写为 `null`，不阻塞日志输出。
- `full` 模式保存完整 messages 和 response 前必须做基础密钥脱敏。

不负责：

- 不作为生产审计日志。
- 不进入 API、SSE 或数据库主流程。
- 不替代 `ToolCallRecord`、`AgentRunDto` 或 workflow artifact。

## 技术栈与依赖

- TypeScript：运行时、工具注册与 SPI 适配层。
- OpenAI-compatible HTTP API：当前模型调用通道，由 `ModelClient` 封装。
- Ajv 与 Zod：分别用于 JSON Schema / DTO 的校验与解析。
- `packages/shared`：使用稳定 DTO 和 SPI；迁移完成后不再通过 backend 类型耦合 workflow。

## 核心实现

| 对象 | 主要职责 |
| --- | --- |
| `AgentRuntime` | 维护 ReAct 回合、观察记录、草稿和循环终止条件。 |
| `WorkflowAgentExecutor` | 将 workflow task 投影为 adapter request，处理候选生成与修复执行。 |
| `ReactPromptComposer` | 组织任务说明、Catalog Context、已读材料和工具观察。 |
| `ToolRegistry` | 将 ReAct 私有 action 路由到 SPI host 的 context / capability 调用。 |
| `WorkflowAgentContextBuilder` | 汇总 task 所需的上下文目录与可见能力。 |
| `ModelClient` | 封装模型请求、超时、日志与原始响应诊断。 |

## 主要协作链路

```text
SPI request
  -> WorkflowAgentExecutor / ContextBuilder
  -> ReactPromptComposer -> ModelClient
  -> AgentRuntime（think -> act -> observe）
  -> SPI host（context、capability、event）
  -> 通用结构化 AgentRunOutcome
```
