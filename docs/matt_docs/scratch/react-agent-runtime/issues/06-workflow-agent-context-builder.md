# 06 - WorkflowAgentContextBuilder

**构建内容：** 新增上下文构建器，把 WorkflowService 已拥有的数据投影为 AgentExecutor 的 `goal`、`facts`、`capabilities` 和 `currentDraft`。

**阻塞关系：** 02 - Runtime types and action parser.

**Status:** planned

## Scope

- 新增 `packages/agent/src/runtime/workflow-agent-context-builder.ts` 或后端侧等价 builder，最终由 WorkflowService 调用。
- 为 plan、revise_plan、generate_candidate、preview_decision 等任务构建目标。
- facts 包含用户原始需求、current snapshot、enabled skills 摘要、uploaded files、clarification answers、confirmed plan、revision feedback、candidate、validation report。
- capabilities 包含 allowed tools、catalogId、catalogVersion、rendererVersion、skill refs。
- builder 不执行模型调用、不执行工具、不推进 workflow。

## Acceptance Criteria

- [ ] plan 初始任务能构建 user request + snapshot + skills/files facts。
- [ ] clarification 提交后能构建 clarification answers fact 并重新生成 plan 目标。
- [ ] plan revise 能构建 previous plan + revision feedback facts。
- [ ] generate candidate 能构建 confirmed plan fact。
- [ ] preview revise to plan 能构建 old plan + candidate + validation report + revision feedback facts。
- [ ] builder 输出可被 PromptComposer 直接消费。

## Out Of Scope

- 不查询数据库；数据由 WorkflowService 传入。
- 不决定 step 状态。
- 不保存 trace。

