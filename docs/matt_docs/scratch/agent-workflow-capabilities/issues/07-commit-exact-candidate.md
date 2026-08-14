# 07 - Commit exact candidate

**构建内容：** 用户确认 preview 后，提交 exact stored `candidate_a2ui_messages` artifact，创建正式 A2UI event、surface snapshot，并完成 workflow。

**阻塞关系：** 06 - Preview decision and revise to plan.

**Status:** resolved

## Scope

- `submit_decision(confirm)` 在 preview 阶段创建 `commit` step。
- commit 使用已经保存并通过 validate 的 candidate artifact。
- commit 不重新调用 Agent Runtime。
- commit 在一个事务内创建正式 A2UI event、assistant message、surface snapshot，并更新 session 当前 snapshot。
- workflow 完成后清理 active 状态。

## Acceptance Criteria

- [x] commit 只能读取 exact stored `candidate_a2ui_messages` artifact。
- [x] candidate artifact 必须包含通过的 validation 结果。
- [x] commit 不接受 raw Agent Output。
- [x] commit 不重新生成 A2UI。
- [x] A2UI event 和 surface snapshot 在同一事务边界内创建。
- [x] workflow status 变为 completed，当前 step 为 completed。
- [x] 提交后的 API/SSE 输出能让前端刷新正式 surface。

## Out Of Scope

- 不修改 Agent candidate 生成逻辑。
- 不实现 UI 交互。
