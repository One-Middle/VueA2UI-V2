# 06 - Cancellation token registry and safe checks

**构建内容：** 增加后端内存 cancellation token registry，并在 Agent workflow 执行安全检查点同时检查 token 和数据库状态。

**阻塞关系：** 依赖 04。

**Status:** planned

## Scope

- 新增轻量运行中 AgentRun registry，例如 `agentRunId -> CancellationToken`。
- workflow task 创建 AgentRun 后注册 token，运行结束或失败后清理 token。
- `cancel` action 标记内存 token cancelled，同时写数据库状态。
- 增加统一检查方法，例如 `assertRunNotCancelled(agentRunId)`。
- 在以下安全点检查：
  - `runtime.runWorkflowTask()` 前。
  - `runtime.runWorkflowTask()` 返回后。
  - 持久化 trace/status message 前。
  - 创建 workflow artifact 前。
  - 推进下一 workflow step 前。
  - `commitExactCandidate()` 进入事务前。
- 进入 commit 事务后保持原子完成。

## Acceptance Criteria

- [ ] 用户 cancel 后，未进入持久化安全点的后续动作会停止。
- [ ] 模型调用返回后如果 run 已取消，不会继续创建新 artifact 或推进下一 step。
- [ ] commit 前检查取消；事务开始后不做半提交回滚。
- [ ] token 清理不会泄漏长期内存。
- [ ] 只靠 DB 状态也能识别取消，支持 token 丢失后的保守行为。

## Out Of Scope

- 不强杀 Node 进程。
- 不要求模型 provider 原生 abort 第一版必须生效。
- 不新增 cancellation token 数据表。
