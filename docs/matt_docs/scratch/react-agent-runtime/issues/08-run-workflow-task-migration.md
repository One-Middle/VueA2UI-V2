# 08 - runWorkflowTask migration

**构建内容：** 将 `runWorkflowTask()` 内部迁移到新的 WorkflowAgentExecutor，同时保留旧 `run()` 和旧 parser 给未迁移路径。

**阻塞关系：** 05 - WorkflowAgentExecutor loop, 06 - WorkflowAgentContextBuilder, 07 - Backend trace persistence and SSE.

**Status:** planned

## Scope

- `createAgentRuntime()` 继续返回兼容 `IAgentRuntime` 的对象。
- `runWorkflowTask()` 内部调用 WorkflowAgentExecutor。
- 将 new executor result 映射回现有 `AgentWorkflowTaskResult`，让 WorkflowService 初期尽量少改。
- `run()` 暂时保留，但 workflow 主路径不再依赖它。
- 旧 `parseWorkflowTaskOutput` 保留给旧链路，不作为 new executor fallback。

## Acceptance Criteria

- [ ] Workflow plan task 通过新 executor 返回 clarification form 或 plan + decision form。
- [ ] generate candidate task 通过新 executor 返回 candidate A2UI。
- [ ] preview decision task 通过新 executor 返回 decision form。
- [ ] 新 executor 不接受旧 markdown / tool-call text 格式。
- [ ] 现有 WorkflowService 测试可逐步迁移，不要求一次重写全部流程。

## Out Of Scope

- 不删除 `run()`。
- 不删除旧 parser。
- 不重写普通非 workflow AgentRun 路径。

