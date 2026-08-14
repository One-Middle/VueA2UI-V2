# 08 - Workflow special UI blocks

**构建内容：** 前端只渲染 parsed/validated artifacts，并在会话流中展示 `askClarification` 和 `askUserDecision` 工具调用产生的特殊 UI block。

**阻塞关系：** 04 - Workflow actions: submit clarification and decision, 06 - Preview decision and revise to plan.

**Status:** resolved

## Scope

- 更新前端 workflow store 和 API client，使用新 action payload。
- 在会话流中渲染 `clarification_form` 特殊 UI block。
- 在会话流中渲染 `decision_form` 特殊 UI block。
- `decision_form` UI 提供三选一：confirm、revise、reject。
- confirm 禁止输入 comment；revise 必须输入 comment；reject 不需要 comment。
- timeline 展示 steps、stageState、agent runs、tool calls、artifact links 和失败状态。

## Acceptance Criteria

- [x] 前端不再调用 `confirm_plan`、`request_revision` 或 `confirm_commit`。
- [x] `clarification_form` 提交调用 `submit_clarification`。
- [x] `decision_form` 提交调用 `submit_decision`。
- [x] `decision_form` 只在对应 artifact/tool call 存在时展示，不由前端硬编码生成。
- [x] `decision_form` 不是普通 message 旁边的按钮。
- [x] 前端不直接渲染 raw Agent Output。
- [x] reload 后 workflow、stageState、artifacts 和可提交表单能恢复。

## Out Of Scope

- 不实现后端状态机。
- 不改变 renderer 的 A2UI 协议核心。
