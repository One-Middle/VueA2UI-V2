# Agent 模块边界

`packages/agent`

定位：受控 Agent Runtime，负责把上下文、工具和模型调用组织为可解析、可校验的结果。

## 负责

- 构建 Agent 上下文和 prompt。
- 调用 OpenAI-compatible API。
- 暴露受控 AgentTool，例如 `askClarification`、`askUserDecision`、`getSkillContent`、`getSkillReferenceContent`、`getCatalogComponentDetails` 和 `validateA2UI`。
- 记录工具调用过程，供后端持久化和 timeline 展示。
- 将 Agent Output 解析、归一化、校验为 Parsed Agent Result。
- 返回 clarification request、Markdown plan、candidate A2UI、decision form 或 failure。

## 不负责

- 直接写数据库。
- 直接提交正式 A2UI event 或 surface snapshot。
- 决定 workflow 能否推进到下一阶段。
- 开放 HTTP API。
- 前端渲染或会话 UI。

## 边界

- 由 `packages/backend` 编排调用。
- 使用 `packages/shared` 的 Agent、A2UI、DTO 和校验类型。
- raw Agent Output 只用于 debug / audit 摘要，不作为业务结果返回给前端主流程。
- Runtime 输出的是 Parsed Agent Result；WorkflowService 决定该结果在当前 gate 下是否合法。
## Model IO Logging 设计

Model IO Logging（模型输入输出日志）是 Agent 模块的本地开发诊断能力，目标是让开发者在后端终端和本地 JSONL trace 文件中查看模型调用的输入、输出、耗时和 token 用量。

设计边界：

- 日志入口放在 `ModelClient.generate()`，覆盖普通 `run()`、Workflow `runWorkflowTask()` 和渐进披露等所有模型调用路径。
- 日志由 `MODEL_IO_LOG=off|summary|debug|full` 控制，和普通 `LOG_LEVEL` 分离。
- `summary` 只输出终端摘要；`debug` 输出截断后的 prompt / response 预览；`full` 额外写入 `logs/model-io/YYYY-MM-DD.jsonl`。
- 每次模型调用生成一个 `requestId`，终端日志和 JSONL 记录共用该 ID。
- `traceContext` 显式传入，可包含 `sessionId`、`agentRunId`、`workflowId`、`workflowStepId`、`task`、`phase`、`attempt` 和 `round`；缺失字段写为 `null`，不阻塞日志输出。
- `full` 模式保存完整 messages 和 response 前必须做基础密钥脱敏。

不负责：

- 不作为生产审计日志。
- 不进入 API、SSE 或数据库主流程。
- 不替代 `ToolCallRecord`、`AgentRunDto` 或 workflow artifact。
