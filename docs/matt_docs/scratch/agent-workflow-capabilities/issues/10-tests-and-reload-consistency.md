# 10 - Tests and reload consistency

**构建内容：** 用单元测试和前端恢复测试证明新 workflow contract、状态机、artifact persistence、SSE/reload 和无 fallback 规则成立。

**阻塞关系：** 01 - Workflow contract foundation through 09 - Retry and failure handling.

**Status:** resolved

## Scope

- 重写旧的 workflow service tests，移除旧 step/action 断言。
- mock `AgentRuntime.runWorkflowTask()` 的 Parsed Agent Result，验证 WorkflowService transition。
- 覆盖 `submit_clarification`、`submit_decision(confirm/revise/reject)`。
- 覆盖 candidate 只在 validate 通过后保存。
- 覆盖 Agent failure / parse failure / gate failure 不 fallback。
- 覆盖 session reload 后恢复 workflow、steps、stageState、artifacts、agent runs、tool calls。

## Acceptance Criteria

- [x] 测试不再断言 `understand`、`clarify`、`propose`、`confirm_plan`、`confirm_commit`。
- [x] plan 阶段 clarification flow 有测试覆盖。
- [x] plan 阶段 decision confirm/revise/reject 有测试覆盖。
- [x] preview 阶段 decision confirm/revise/reject 有测试覆盖。
- [x] validate 成功和失败路径都有测试覆盖。
- [x] Runtime failure 时 step failed，且不会生成假 plan 或假 clarification。
- [x] reload 后 `clarification_form` 和 `decision_form` 仍可恢复为可提交 UI。
- [x] 前端或 store 测试覆盖新 action payload。

## Out Of Scope

- 不追求端到端真实模型调用测试。
- 不要求视觉回归测试覆盖所有 UI 状态。
