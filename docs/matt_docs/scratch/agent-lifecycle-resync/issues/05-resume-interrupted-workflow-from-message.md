# 05 - Resume interrupted workflow from message

**构建内容：** 让 interrupted workflow 在用户发送非空普通消息后沿原 workflow step 继续，创建新的 AgentRun 承载本次继续尝试。

**阻塞关系：** 依赖 04。

**Status:** planned

## Scope

- 修改 `packages/backend/src/services/message.service.ts` 的 active workflow 消息路径。
- 当 active workflow status 为 `interrupted` 时，调用新的 resume interrupted service 方法。
- resume 方法应复用当前 interrupted step。
- 当前 step 从 `interrupted` 更新为 `running`。
- 创建新的 AgentRun，绑定原 `workflowId`、原 `workflowStepId` 和新 `triggerMessageId`。
- 新用户消息必须非空；空继续不在第一版支持。
- 保留所有已持久化 artifacts。
- 返回 `SendMessageResponse.workflow` 和新 `agentRun` 摘要。

## Acceptance Criteria

- [ ] interrupted workflow 收到非空普通消息后不会创建新 workflow。
- [ ] 新 AgentRun 绑定原 workflow step。
- [ ] 原 cancelled AgentRun 保持历史状态。
- [ ] 当前 step 从 `interrupted` 回到 `running`。
- [ ] 已有 artifacts 未被删除。
- [ ] 前端可以通过 `SendMessageResponse` 立即更新运行态。

## Out Of Scope

- 不实现“空继续”按钮。
- 不实现用户选择“继续当前 workflow / 开启新 workflow”。
- 不改变 failed_retryable 续跑语义，除非需要提取共享 helper。
