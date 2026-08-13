# 07 - Confirm candidate commit

**构建内容：** 允许用户确认已预览的 Candidate A2UI，并通过现有正式 A2UI event 和 surface snapshot 边界提交 exactly that artifact。

**阻塞关系：** 06 - Candidate A2UI generation.

**Status:** resolved

- [x] Workflow 只对已校验、可预览的 candidate artifact 暴露 `confirm_commit` action。
- [x] `confirm_commit` 阶段通过 WorkflowStageGate 校验 candidate artifact 已存在、已校验且可预览。
- [x] 确认 commit 会提交 exact stored candidate artifact，而不是重新生成的结果。
- [x] 现有 validation 和 transaction boundary 会创建 assistant message、A2UI event、current surface snapshot 和 completed Agent run state。
- [x] Workflow 会记录 commit metadata，把 completed workflow 关联到已提交 message、A2UI event 和 snapshot。
- [x] Workflow 以 `completed` status 和 `committed` completion reason 完成。
- [x] 测试证明未确认 candidates 不会影响正式 session state，而已确认 candidates 会影响正式状态。

## Implementation notes

- `confirm_commit` action 先由 `WorkflowService.confirmCandidateCommit()` 校验当前 `preview` step、candidate artifact 和 validation 状态。
- `AgentRunService.commitWorkflowCandidate()` 在正式事务边界中提交 artifact 内保存的 exact A2UI messages，创建 assistant message、A2UI event、current surface snapshot，并完成 workflow。
- Candidate generation 阶段不会提交正式状态；只有 `confirm_commit` 会改变 current snapshot。
