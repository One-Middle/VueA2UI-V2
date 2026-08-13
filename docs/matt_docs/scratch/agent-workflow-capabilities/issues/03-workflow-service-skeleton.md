# 03 - WorkflowService skeleton

**构建内容：** 引入 `WorkflowService` 作为后端编排层，使它可以创建、加载、推进、失败、取消和完成 workflows，并为后续真实 Agent generation 提供 gate、persistence 和 API 输出边界。

**阻塞关系：** 01 - Workflow persistence foundation, 02 - Shared workflow contracts.

**Status:** resolved

- [x] 当没有 active workflow 时，`WorkflowService` 可以为 session 创建新 workflow。
- [x] `WorkflowService` 会拒绝或安全处理同一 session 中创建第二个 active workflow 的尝试。
- [x] `WorkflowService` 可以按依赖顺序追加和更新 Workflow Step 记录。
- [x] `WorkflowService` 可以创建与 workflow 和 step 关联的 Workflow Artifact 记录。
- [x] `WorkflowService` 只消费 Agent Runtime 返回的 Parsed Agent Result，不直接消费 Agent Output。
- [x] `WorkflowService` 负责应用 WorkflowStageGate，把合法 Parsed Agent Result 转换为 workflow artifacts、messages、step 状态和 API Output。
- [x] workflows、steps 和 artifacts 变化时，`WorkflowService` 会发送 workflow SSE events。
- [x] 后端测试覆盖多条 historical workflows、single active workflow enforcement、step transitions、artifact creation 和 workflow completion。
