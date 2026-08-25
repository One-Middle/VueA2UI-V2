# 04 - Backend interrupted workflow contract

**构建内容：** 重构后端 `cancel` WorkflowAction，使它中断当前运行并保留 workflow 可继续，而不是把 workflow 置为不可继续终态。

**阻塞关系：** 依赖 01。

**Status:** planned

## Scope

- 将 `ACTIVE_WORKFLOW_STATUSES` 扩展为包含 `interrupted`。
- 重构现有 `cancelWorkflow()` 或新增 `interruptWorkflow()`，让 `cancel` action 使用新语义。
- running workflow cancel 时：
  - 当前 running AgentRun 置为 `cancelled`。
  - 当前 workflow 置为 `interrupted`。
  - 当前 step 置为 `interrupted`。
  - metadata 写入 `interruptionReason: "user_cancelled"`。
- 对已经 `interrupted` 的 workflow，重复 cancel 幂等返回当前状态。
- 对 completed / terminal failed workflow，返回不可取消错误。
- 发送 `workflow_interrupted` SSE。
- HTTP action 响应返回最新 workflow、agentRun，并尽量返回 step。

## Acceptance Criteria

- [ ] `cancel` 不再把 workflow 置为 terminal `cancelled`。
- [ ] running workflow cancel 后 workflow/step 是 `interrupted`。
- [ ] running AgentRun cancel 后状态是 `cancelled`。
- [ ] repeated cancel on interrupted workflow is idempotent。
- [ ] completed workflow cancel 被拒绝。
- [ ] `workflow_interrupted` SSE 被发送。
- [ ] cancel HTTP 响应不依赖 SSE 即可让当前客户端更新 UI。

## Out Of Scope

- 不实现 cancellation token 安全检查点。
- 不实现 interrupted 后的普通消息续跑。
- 不实现 startup repair。
