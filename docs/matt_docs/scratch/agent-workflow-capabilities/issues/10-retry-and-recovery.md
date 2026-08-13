# 10 - Retry and recovery

**构建内容：** 让 failed workflow steps 可重试，并让 session reload 连贯恢复完整 workflow timeline、artifacts、preview candidates 和 formal snapshot state。

**阻塞关系：** 07 - Confirm candidate commit, 08 - Workflow timeline frontend, 09 - Workflow main workspace UI.

**Status:** resolved

- [x] Failed workflow steps 暴露 retry actions，只用现有 context 重新运行失败 step。
- [x] 重试失败的 Agent step 时，会重新运行真实 Agent Runtime；不会使用后端模板 fallback 补齐 plan、clarification 或 candidate。
- [x] 重试 `generate_a2ui` 或 `validate` 时，复用已确认 plan、相关 candidate 或 validation history、current snapshot、Skills、files 和 recent messages。
- [x] 除非用户明确要求新 plan，否则 retry 不会重启 clarification 或 plan confirmation。
- [x] 重新加载 session 时，恢复 historical workflows、active workflow state、steps、artifacts、Agent runs、tool calls 和 formal current snapshot。
- [x] 如果 reload 时存在未提交 Candidate A2UI，提供清晰方式恢复 candidate preview，且不会把它与 formal state 混淆。
- [x] End-to-end tests 覆盖从 requirement 到 plan、plan confirmation、candidate preview、commit confirmation、reload recovery、failed step retry 和 completed workflow history 的路径。

## Implementation notes

- `retry_step` action 当前支持重试失败的 `generate_a2ui` step：后端复用最新已确认 plan，新建 `generate_a2ui` retry step，并启动 workflow-scoped Candidate run。
- Frontend `WorkflowPanel` 在 validation report 区域暴露“重试失败步骤”，reload 后仍可从 workflow history 恢复 artifact 和 retry 入口。
- Reload 后恢复的是 parsed/validated artifacts 和 API Output 状态；raw Agent Output 只作为 AgentRun debug metadata 摘要存在，不参与业务恢复。
- 自动化覆盖目前是 service/store 层：backend 和 frontend tests 覆盖 workflow state、candidate commit、SSE recovery 和 renderer snapshot recovery；完整 browser E2E 可在后续接入 Playwright。
