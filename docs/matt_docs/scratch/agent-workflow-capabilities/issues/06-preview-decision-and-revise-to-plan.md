# 06 - Preview decision and revise to plan

**构建内容：** 在 validated candidate preview 后，通过 Agent 调用 `askUserDecision` 生成 decision form，让用户确认、要求修改或拒绝。preview 阶段的 revise 必须回到 plan。

**阻塞关系：** 05 - Generate and validate split.

**Status:** resolved

## Scope

- validate 通过后创建 `preview` step。
- preview 展示 validated `candidate_a2ui_messages` artifact。
- Agent 在 preview 阶段调用 `askUserDecision`，生成 target 为 `candidate_a2ui_messages` 的 `decision_form`。
- preview step 进入 `awaiting_confirmation + awaiting_preview_confirmation`。
- `submit_decision(revise)` 在 preview 阶段回到新的 plan iteration，并把旧 plan、candidate、validation、用户 comment 和最近上下文传给 Agent。
- `submit_decision(reject)` 停留当前 preview 等待态。

## Acceptance Criteria

- [x] preview 只能基于 validated candidate artifact 创建。
- [x] preview 的 `decision_form.target` 为 `candidate_a2ui_messages`。
- [x] preview decision form 关联 target candidate artifact。
- [x] `submit_decision(confirm)` 在 preview 阶段进入 `commit`。
- [x] `submit_decision(revise)` 在 preview 阶段必须带 comment，并创建/运行新的 `plan` step 或 plan iteration。
- [x] preview revise 不覆盖旧 plan、candidate 或 validation artifact。
- [x] `submit_decision(reject)` 记录用户 message 后继续停留在 `awaiting_preview_confirmation`。

## Out Of Scope

- 不执行 commit。
- 不实现前端 preview UI 细节。
