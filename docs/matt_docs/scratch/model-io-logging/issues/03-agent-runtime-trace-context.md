# 03 - Agent Runtime trace context

**构建内容：** 为 Agent Runtime 的所有模型调用点传入显式 `traceContext`，让日志能区分普通生成、修复、Workflow task 和渐进披露轮次。

**阻塞关系：** Depends on `02-model-client-jsonl-integration`.

**Status:** resolved

## Scope

- 在 `AgentRuntime.run()` 的初始生成路径传入：
  - `sessionId`
  - `phase: "progressive_disclosure"` 或更具体的初始生成阶段
  - `attempt`
  - `round`
- 在修复路径传入：
  - `sessionId`
  - `phase: "repair"`
  - `attempt`
- 在 `runWorkflowTask()` 传入：
  - `sessionId`
  - `workflowId`
  - `workflowStepId`
  - `task`
  - `phase: "workflow_task"`
  - `attempt: 1`
- 如果调用点没有 `agentRunId`，保持 `null`，不为补字段扩大后端接口。
- 保留现有 Agent Runtime 业务日志，不用本 issue 重构旧 logger。

## Acceptance Criteria

- [x] 普通 `run()` 路径的模型调用日志带 `sessionId`、`phase`、`attempt` 和必要时的 `round`。
- [x] `runWorkflowTask()` 路径的模型调用日志带 `workflowId`、`workflowStepId` 和 `task`。
- [x] Workflow plan / clarification / preview 阶段的模型输入输出能通过统一 Model IO logger 看到。
- [x] 缺失 `agentRunId` 时 JSONL 中为 `null`，不导致日志或模型调用失败。
- [x] 不改变 `IAgentRuntime` 对 backend 暴露的入口语义。

## Out Of Scope

- 不把 `agentRunId` 反向注入到 Agent Runtime 输入契约。
- 不修改 workflow 状态机。
- 不新增前端展示。
