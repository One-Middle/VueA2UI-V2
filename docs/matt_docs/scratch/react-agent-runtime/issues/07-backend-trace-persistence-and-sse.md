# 07 - Backend trace persistence and SSE

**构建内容：** 在 backend 接收 AgentExecutor trace events，实时发送 `agent_trace_event`，并在 run 结束时保存 trace summary。

**阻塞关系：** 01 - Shared trace and SSE contract, 05 - WorkflowAgentExecutor loop.

**Status:** planned

## Scope

- 在 WorkflowService 或 agent run orchestration 层接收 `onTraceEvent(event)`。
- 将 trace event 转为 `AgentTraceEventDto` 并通过 `streamService.send` 发送。
- 内存累积 `AgentRunTraceSummaryDto`。
- run 结束时写入 `agent_runs.metadata.traceSummary`。
- `reasoningSummary` 同时进入 `tool_calls.inputSummary.reasoningSummary` 和 trace summary。
- `GET agent-run detail` 返回 `traceSummary`。

## Acceptance Criteria

- [ ] 每个 iteration 可以实时发送 `agent_trace_event`。
- [ ] trace raw events 不逐条持久化。
- [ ] run 完成/失败后 metadata 包含 trace summary。
- [ ] AgentRun detail API 返回 trace summary 和现有 tool calls。
- [ ] 现有 `agent_run_attempt` 仍兼容现有 tool call 消费。

## Out Of Scope

- 不新增 trace 表。
- 不做前端 UI 展示。
- 不替换 backend logger。

