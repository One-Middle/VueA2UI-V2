# 01 - Shared lifecycle and SSE contract

**构建内容：** 更新 shared DTO 与 SSE 契约，让前后端都能表达 `connected`、`workflow_interrupted` 和可继续的 `interrupted` workflow 状态。

**阻塞关系：** 无。

**Status:** planned

## Scope

- 在 `packages/shared/src/api.ts` 中为 `AgentWorkflowStatus` 增加 `interrupted`。
- 在 `packages/shared/src/api.ts` 中为 `WorkflowStepStatus` 增加 `interrupted`。
- 确认 `AgentRunStatus` 包含 `cancelled`，不新增 workflow 终态语义。
- 如前端 cancel 响应需要直接拿到 step，扩展 `WorkflowActionResponse` 增加 `step?: WorkflowStepDto`。
- 在 `packages/shared/src/sse.ts` 中增加 `connected`。
- 在 `packages/shared/src/sse.ts` 中增加 `workflow_interrupted`，payload 包含 `sessionId`、workflow、step 和 agentRun 摘要。
- 更新 shared 类型导出和现有类型测试。

## Acceptance Criteria

- [ ] `AgentWorkflowStatus` 可以表达 `interrupted`。
- [ ] `WorkflowStepStatus` 可以表达 `interrupted`。
- [ ] `connected` SSE payload 有共享类型。
- [ ] `workflow_interrupted` SSE payload 有共享类型。
- [ ] Backend 和 Frontend 引入新类型时不需要重复定义 payload。
- [ ] TypeScript 编译通过。

## Out Of Scope

- 不实现后端中断逻辑。
- 不实现前端重连恢复。
- 不实现 cancellation token。
