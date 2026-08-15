# 10 - Frontend trace store support

**构建内容：** 前端 store 支持接收 `agent_trace_event`，保存 runtime trace events，但第一版不新增 UI。

**阻塞关系：** 01 - Shared trace and SSE contract, 07 - Backend trace persistence and SSE.

**Status:** planned

## Scope

- 在 workspace store 新增 `runtimeTraceEvents: AgentTraceEventDto[]`。
- 在 SSE handler 中消费 `agent_trace_event`。
- 切换 session / 新会话时清理 runtime trace events。
- 保留现有 `runtimeToolCalls` 逻辑。
- 不新增可视化 panel。

## Acceptance Criteria

- [ ] 前端能接收并存储 `agent_trace_event`。
- [ ] trace events 与 tool calls 分开存储。
- [ ] session 切换不会污染新 session。
- [ ] 现有 WorkflowPanel 行为不变。
- [ ] 现有 runtime tool call 展示不受影响。

## Out Of Scope

- 不新增 AgentTracePanel。
- 不设计 iteration timeline UI。
- 不做 trace event 持久化缓存。

