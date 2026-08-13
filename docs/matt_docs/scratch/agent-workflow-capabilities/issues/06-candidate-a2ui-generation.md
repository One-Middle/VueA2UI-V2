# 06 - Candidate A2UI generation

**构建内容：** 生成、校验、版本化并存储 Candidate A2UI artifacts，但不把它们提交为正式 A2UI events 或 surface snapshots。

**阻塞关系：** 05 - Clarification and plan artifacts.

**Status:** resolved

- [x] 确认 plan 后，workflow 会推进到 `generate_a2ui`、`validate` 和 `preview`。
- [x] `generate_a2ui` 阶段通过 WorkflowStageGate 校验已确认 plan 前置条件，并只允许 Agent 产出 Candidate A2UI。
- [x] Candidate A2UI generation 使用已确认 plan、current snapshot、enabled Skills、relevant files 和 recent session context。
- [x] Candidate A2UI 必须通过 `validateA2UI` 后才能预览。
- [x] Validation failures 会创建 `validation_report` artifacts 和 failed step state，但不会创建 A2UI events 或 surface snapshots。
- [x] 成功的 candidate output 会保存为带版本的 `candidate_a2ui_messages` artifact。
- [x] `generate_a2ui` 和 `validate` 阶段不得直接提交正式 A2UI events 或 surface snapshots。
- [x] 在 `preview` 或 `confirm_commit` 阶段，用户可以用自然语言提交修改请求；WorkflowStageGate 会保留旧 candidate version，并按修改范围决定回到 plan revision 或 candidate regeneration。
- [x] 用户修改后重新生成时，会保留旧 candidate versions 并创建新版本。

## Implementation notes

- `POST /api/sessions/:sessionId/workflow/actions` 支持 `confirm_plan`，确认后创建 `generate_a2ui` step 并启动 workflow-scoped Agent run。
- Candidate run 复用现有 Agent Runtime、Skill resolver、recent messages、ready files、current snapshot 和 `validateA2UI` tool call 记录。
- Runtime 成功结果保存为 `candidate_a2ui_messages` artifact，失败结果保存为 `validation_report` artifact；两者都不会创建正式 A2UI event 或 surface snapshot。
- 后续 Ticket 07 会继续实现已预览 candidate 的确认提交。
