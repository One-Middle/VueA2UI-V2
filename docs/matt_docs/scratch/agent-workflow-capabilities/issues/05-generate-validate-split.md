# 05 - Generate and validate split

**构建内容：** 明确拆分 `generate_a2ui` 和 `validate`。Agent 先生成 candidate A2UI Parsed Agent Result，后端随后进入 validate 阶段；只有 validate 通过后才保存 `candidate_a2ui_messages` artifact。

**阻塞关系：** 04 - Workflow actions: submit clarification and decision.

**Status:** resolved

## Scope

- `submit_decision(confirm)` 在 plan 阶段完成 plan，并创建 `generate_a2ui` step。
- `generate_a2ui` 调用真实 Agent Runtime 生成 candidate A2UI Parsed Agent Result。
- `generate_a2ui` 不写 `candidate_a2ui_messages` artifact。
- `validate` 调用 `validateA2UI` 校验 candidate。
- validate 结果写入 `validation_report` artifact。
- validate 通过后才写入 `candidate_a2ui_messages` artifact 并进入 preview。

## Acceptance Criteria

- [x] `generate_a2ui` gate 校验必须存在已确认 plan。
- [x] `generate_a2ui` 只能接受 candidate A2UI 或 failure 类型 Parsed Agent Result。
- [x] `generate_a2ui` 成功后进入 `validate`，不直接进入 `preview`。
- [x] validate 成功时写 `validation_report` 和 `candidate_a2ui_messages`。
- [x] validate 失败时只写 `validation_report`，不写 candidate artifact。
- [x] 未通过 validate 的 candidate 不允许进入 preview。
- [x] `generate_a2ui` 和 `validate` 都不得提交正式 A2UI event 或 surface snapshot。

## Out Of Scope

- 不实现 preview decision。
- 不实现 commit exact candidate。
