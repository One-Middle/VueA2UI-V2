# 02 - Frontend stream connected lifecycle

**构建内容：** 修复 SSE 初始连接状态延迟问题，并让底层 stream client 暴露首次连接和重连成功的生命周期。

**阻塞关系：** 依赖 01。

**Status:** planned

## Scope

- 修改 `packages/frontend/src/services/stream.ts`，解析 `connected` SSE 事件。
- 为 `connectStream()` 增加 `onConnected?: (input: { reconnect: boolean; lastEventId: string | null }) => void`。
- 首次连接成功时触发 `onConnected({ reconnect: false })`。
- 断线重试后连接成功时触发 `onConnected({ reconnect: true })`。
- 保留现有 `onError`、`onReconnecting`、`onClosed` 语义。
- 补充 `stream.test.ts`，覆盖拆包解析、connected 事件和 reconnect flag。

## Acceptance Criteria

- [ ] 后端发送 `connected` 后前端能立即进入 connected 生命周期。
- [ ] 首次连接不会被误判为 reconnect。
- [ ] 断线后重连成功会触发 `reconnect: true`。
- [ ] `Last-Event-ID` 仍在重连请求中携带。
- [ ] 主动 `close()` 后不再触发重连或 onConnected。

## Out Of Scope

- 不实现 Session Resync。
- 不修改 workspace store 业务状态。
- 不实现后端事件回放。
