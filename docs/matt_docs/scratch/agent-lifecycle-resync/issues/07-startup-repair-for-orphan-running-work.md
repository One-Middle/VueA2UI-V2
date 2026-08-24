# 07 - Startup repair for orphan running work

**构建内容：** 后端启动时修复进程重启留下的 orphan running AgentRun/workflow/step，避免前端永远显示运行中。

**阻塞关系：** 依赖 04。

**Status:** planned

## Scope

- 在后端启动流程中加入 repair step，或提供启动时调用的 service。
- 查询仍为 `running` 且没有内存 token 的 AgentRun。
- 将 orphan AgentRun 标记为 `cancelled`。
- 将相关 workflow 标记为 `interrupted`。
- 将相关 current step 标记为 `interrupted`。
- metadata 写入 `interruptionReason: "server_restarted"`。
- 记录日志，便于本地排查。

## Acceptance Criteria

- [ ] 后端启动后不会保留无法继续推进的 orphan running AgentRun。
- [ ] 相关 workflow/step 进入 `interrupted`，用户可通过普通消息继续。
- [ ] repair 不影响 completed/failed/interrupted 历史记录。
- [ ] repair 操作幂等。
- [ ] 日志包含修复数量和 session/workflow/run 摘要。

## Out Of Scope

- 不在启动时自动续跑 Agent。
- 不处理多实例分布式租约。
- 不新增后台调度系统。
