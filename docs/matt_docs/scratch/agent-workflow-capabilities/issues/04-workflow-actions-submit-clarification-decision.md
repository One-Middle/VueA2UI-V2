# 04 - Workflow actions: submit clarification and decision

**构建内容：** 实现前端通过 HTTP action 推进 workflow 的两个关键动作：提交 clarification form 和提交 decision form。

**阻塞关系：** 03 - Plan stage state machine.

**Status:** resolved

## Scope

- 修改 workflow action route 和 validation schema，支持 `submit_clarification` 与 `submit_decision`。
- `submit_clarification` 只作用于当前 `plan + awaiting_clarification`。
- `submit_decision` 同时服务 plan decision 和 preview decision，但根据当前 step/stageState 做 gate 校验。
- 后端记录用户可见 message，保持 workflow timeline 可恢复。
- 普通 `sendMessage` 不绕过 gate 推进关键阶段。

## Acceptance Criteria

- [x] `submit_clarification` payload 为 `{ answers, additionalText? }`。
- [x] `submit_clarification` 保存用户回答 message，并让当前 plan step 回到 `running` 重新调用 Agent。
- [x] `submit_decision` payload 为 `{ selectedOption, comment? }`。
- [x] `submit_decision(confirm)` 不允许 comment。
- [x] `submit_decision(revise)` 必须有非空 comment。
- [x] `submit_decision(reject)` 不要求 comment，记录用户 message 后停留当前等待态。
- [x] 非法 action、artifact 不匹配、stageState 不匹配时返回稳定错误，不由后端猜测用户真实意图。
- [x] `confirm_plan`、`request_revision`、`confirm_commit` 不再作为生产 workflow action 使用。

## Out Of Scope

- 不实现 preview 阶段的具体 revise-to-plan 上下文拼装。
- 不实现前端 UI。
