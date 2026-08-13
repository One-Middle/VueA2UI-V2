# 09 - Workflow main workspace UI

**构建内容：** 增加面向用户的 workflow 主工作区界面，用于 Clarification Forms、Markdown plans、Candidate A2UI preview、confirmation actions 和 modification requests。

**阻塞关系：** 05 - Clarification and plan artifacts, 06 - Candidate A2UI generation, 08 - Workflow timeline frontend.

**Status:** resolved

- [x] Clarification Form artifacts 渲染为 select、radio、checkbox、text、textarea 和额外自然语言输入等表单控件。
- [x] 提交 clarification answers 会推进 active workflow，而不是启动无关 workflow。
- [x] Plan Markdown artifacts 在主工作区渲染，并提供 confirm 和 request-modification actions。
- [x] Candidate A2UI artifacts 可以喂给 Renderer 作为 uncommitted preview。
- [x] UI 清楚区分当前正式 session state 与待处理 Candidate A2UI preview。
- [x] 用户可以在 preview state 下确认 commit，或提供自然语言 modification requests。

## Implementation notes

- `WorkflowPanel` 位于创作工作台中栏，用于展示 Clarification Form、Markdown plan、Candidate A2UI、validation report 和 timeline。
- `confirm_plan` 和 `confirm_commit` 通过 `POST /workflow/actions` 推进；自然语言修改仍复用 `sendMessage()`，由后端 active workflow gate 处理。
- Candidate preview 通过 `renderer.replaceMessages()` 恢复到 Renderer，不会自动提交正式 snapshot；正式状态只在 `confirm_commit` 后变化。
