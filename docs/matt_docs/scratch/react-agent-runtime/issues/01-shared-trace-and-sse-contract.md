# 01 - Shared trace and SSE contract

**构建内容：** 为 ReAct Agent runtime 增加前后端共享的 trace DTO 和 `agent_trace_event` SSE 契约，同时保持 AgentRun 列表 DTO 轻量。

**阻塞关系：** 无。

**Status:** planned

## Scope

- 在 `packages/shared/src/api.ts` 或合适共享模块中新增 `AgentTraceEventDto`。
- 新增 `AgentRunTraceSummaryDto`，用于 AgentRun detail API 恢复。
- 扩展 `AgentRunDetailResponse`，增加 `traceSummary: AgentRunTraceSummaryDto | null`。
- 扩展 `ServerSentEventName` 和 `PlatformSseEvent`，增加 `agent_trace_event`。
- 不给 `AgentRunDto` 列表类型增加 metadata。

## Acceptance Criteria

- [ ] `agent_trace_event` SSE payload 使用共享 DTO。
- [ ] AgentRun detail 响应可以表达 trace summary。
- [ ] AgentRun 列表响应保持轻量，不暴露完整 metadata。
- [ ] TypeScript 编译能证明 backend/frontend 对新 DTO 的导入一致。

## Out Of Scope

- 不实现 backend SSE 发送。
- 不实现 frontend store 消费。
- 不定义 executor 内部完整 trace 类型。

