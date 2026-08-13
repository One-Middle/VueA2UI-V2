# 01 - Workflow persistence foundation

**构建内容：** 增加 Agent Workflow 历史的持久化模型，使一个 session 可以随时间包含多个 workflows，同时同一时刻只允许一个 active workflow。

**阻塞关系：** None - can start immediately.

**Status:** resolved

- [x] 一个 session 可以随时间持久化多条 Agent Workflow 记录。
- [x] 数据模型表示 Workflow Step 记录，并包含 status、ordering、type、attempts、failure metadata 和 confirmation metadata。
- [x] 数据模型表示 Workflow Artifact 记录，支持 `clarification_form`、`plan_markdown`、`candidate_a2ui_messages` 和 `validation_report`。
- [x] Agent runs 和用户可见 messages 可以关联到 workflow，并在相关时关联到 workflow step。
- [x] 数据库或 service layer 可靠保证同一 session 同一时刻只有一个 workflow 可以处于 active、running、awaiting confirmation 或 retryable 状态。
- [x] 数据库契约文档已更新，说明 workflow、step 和 artifact persistence。
