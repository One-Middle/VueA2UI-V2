# 03 - Frontend Session Resync store support

**构建内容：** 在 workspace store 中实现 SSE 重连后的全量 Session Resync，用后端事实源修复断线期间漏掉的实时事件。

**阻塞关系：** 依赖 02。

**Status:** planned

## Scope

- 在 `packages/frontend/src/stores/workspace.ts` 中新增 `recoverSessionState(sessionId, revision)` 或等价 action。
- 重连成功后重新加载 messages、workflows、agent runs、A2UI events、surface snapshots 和 session detail。
- `loadSessionDetail()` 继续用 current snapshot 恢复 Renderer。
- 增加 `_resyncInFlight` 或 token，保证同一 session/revision 下只允许最新 resync 写状态。
- 沿用 `_sessionRevision` 和 `isCurrentSession()` 防止旧会话污染。
- Session Resync 失败时保留旧 UI，设置会话同步错误，不把 SSE connected 改成 error。
- 处理 `workflow_interrupted` SSE，停止 generating 状态并更新 workflow、step、agentRun。

## Acceptance Criteria

- [ ] 首次 SSE 连接不额外触发 Session Resync。
- [ ] SSE 重连成功触发全量 Session Resync。
- [ ] 旧 session 的 resync 响应不能污染新 session。
- [ ] 同一 session 的过期 resync 响应不能覆盖较新的 resync。
- [ ] `surface_snapshot` 和 session detail current snapshot 都能恢复 Renderer。
- [ ] Resync 失败时保留已有 messages/workflows/Renderer 状态。
- [ ] `interrupted` workflow 不计入 generating，但 UI 可识别为可继续状态。

## Out Of Scope

- 不修改后端 API。
- 不实现 durable SSE replay。
- 不新增复杂 trace UI。
