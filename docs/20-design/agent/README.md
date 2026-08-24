# Agent 模块边界

`packages/agent`

定位：受控 Agent Runtime，负责把上下文、工具和模型调用组织为可解析、可校验的结果。

## 负责

- 构建 Agent 上下文和 prompt。
- 调用 OpenAI-compatible API。
- 暴露受控 AgentTool：`askClarification`、`askUserDecision`、`getSkillContent`、`getSkillReferenceContent`、`getCatalogComponentDetails` 和 `validateA2UI`。
- 以 ReAct 循环（think → act → observe）执行 workflow task，并产出 trace 事件供后端转发 SSE。
- 维护 Resource Ledger，在 workflow 的多个 task 之间共享已披露 Skill / Skill Reference 并做去重。
- 维护已披露 Catalog 组件规范上下文，使模型在生成或修复 A2UI 时直接读取组件允许字段、禁止字段和修复提示。
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

## ReAct 输出协议

Workflow 路径下，模型每轮只能输出单个 ReAct action envelope：

- `tool_call`：调用一个当前 gate 授权的 AgentTool。
- `final_draft`：提交当前 task 的最终草稿。
- `give_up`：声明无法继续，并标记是否可恢复。

Workflow 路径不接受普通 A2UI 生成旧格式 `{ assistantMessage, a2uiMessages }` 作为模型顶层输出。生成候选 A2UI 时，模型必须输出：

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

普通非 workflow `run()` 路径仍可使用 `{ assistantMessage, a2uiMessages }`。Skill 文档在 workflow prompt 中注入时，必须避免把普通路径的最终输出格式表达为 workflow 顶层输出格式。

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
