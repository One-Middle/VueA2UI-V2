# 数据库契约

## 1. 定位

本文档是 PostgreSQL / Prisma 数据模型的唯一权威入口。实际 schema 位于 `packages/backend/prisma/schema.prisma`，两者必须保持一致。

历史完整数据库设计稿已归档到 `docs/90-notes/archive/product/db-schema.md`；如需要恢复详细字段说明，应迁移到本文档。

## 2. 核心表

- `sessions`：一次 UI 创作上下文。
- `messages`：用户和 assistant 的自然语言消息。
- `uploaded_files`：用户上传的 `.txt` 文件。
- `skills`：可注入 Agent 上下文的文本说明；`metadata.references` 保存该 Skill 的参考资料列表，结构为 `id`、`title`、`content` 和可选 `description`。
- `session_skills`：会话与 skill 的启用关系。
- `agent_workflows`：session 内一次可恢复的 Agent Workflow 过程。
- `workflow_steps`：Agent Workflow 中可观测、可失败重试和可确认的阶段记录。
- `workflow_artifacts`：Agent Workflow 中产生的过程产物，例如澄清表单、决策表单、Markdown 方案、候选 A2UI messages 和校验报告。
- `agent_runs`：一次模型生成或修复过程。
- `tool_calls`：校验、组件详情披露等工具调用记录。
- `a2ui_events`：已提交的 A2UI 消息批次。
- `surface_snapshots`：某次提交后的 materialized surface 状态。
- `renderer_events`：Renderer action 或 error 回传。

## 3. 关键约束

- 失败的 Agent run 不写入 A2UI events，不生成新的 surface snapshot。
- A2UI event 只能保存通过 `validateA2UI` 的消息批次。
- Surface snapshot 必须由 committed A2UI events 物化得到。
- 文件上传只允许用户上传的 `.txt` 文件，不允许任意路径读取。
- API key 不得写入数据库。
- 一个 session 可以保留多次 Agent Workflow 历史，但同一时刻只能有一个处于 active、running、awaiting confirmation 或 retryable 状态的 workflow。
- Agent run 和用户可见 message 可以关联到 workflow 和 workflow step，便于恢复完整 workflow timeline。
- `failed_retryable` workflow 收到新的普通用户 message 时，可以复用最新失败 step 恢复执行；新的 Agent run 绑定原 `workflowStepId` 和新 `triggerMessageId`，`workflow_steps.attempt_count` 递增记录同一阶段的尝试次数。
- Candidate A2UI 只能作为 workflow artifact 保存；用户确认提交前不得写入 A2UI events 或 surface snapshots。
- `workflow_steps.type` 集合为 `plan`、`generate_a2ui`、`validate`、`preview` 和 `commit`。
- `workflow_steps.stage_state` 是主状态字段，用于保存领域等待态：`awaiting_clarification`、`awaiting_plan_confirmation`、`awaiting_preview_confirmation` 或 `null`。该字段是独立列，不放 `metadata`。
- `workflow_artifacts.kind` 集合为 `clarification_form`、`decision_form`、`plan_markdown`、`candidate_a2ui_messages` 和 `validation_report`。
- `workflow_artifacts` 只保存 Parsed Agent Result 或后端校验后的稳定产物，raw Agent Output 不得写入 artifact content。
- `decision_form.metadata` 至少保存 `source: "askUserDecision"`、`agentRunId` 和 `toolCallId`，形成 `decision_form artifact -> tool_call` 的单向关联。
- `candidate_a2ui_messages` 只能在 `validate` 通过后保存；validate 失败时只保存 `validation_report`。
- `agent_workflows.metadata.resourceLedger` 保存跨 task 共享的 Resource Ledger Snapshot（已披露 Skill / Reference 的键与元信息，不含正文）。
- `agent_runs.metadata.traceSummary` 保存 ReAct 循环 trace 摘要，供 AgentRun detail API 恢复；实时 trace 通过 `agent_trace_event` SSE 推送，不单独建表。

## 3.1 Agent Workflow 状态机

阶段：

```text
plan -> generate_a2ui -> validate -> preview -> commit
```

`plan` 阶段内部等待态：

- `running + null`：Agent 正在理解需求或生成 plan。
- `awaiting_confirmation + awaiting_clarification`：等待用户提交 clarification form。
- `awaiting_confirmation + awaiting_plan_confirmation`：等待用户确认、修改或拒绝 plan。
- `completed + null`：plan 已确认，可以进入 `generate_a2ui`。

`preview` 阶段内部等待态：

- `awaiting_confirmation + awaiting_preview_confirmation`：等待用户确认、修改或拒绝 preview。
- 用户选择 `revise` 后回到新的 `plan` 轮次，不覆盖旧 artifact。

`commit` 阶段提交 exact stored `candidate_a2ui_messages` artifact，必须创建正式 A2UI event、surface snapshot，并完成 workflow。

## 4. 提交事务

Agent 成功提交时，必须在一个 Prisma 事务内完成：

1. 更新 Agent run 状态。
2. 创建 assistant message。
3. 创建 A2UI event。
4. 基于事务内可见 events 生成 surface snapshot。
5. 更新 session 当前 snapshot 和最后运行信息。

事件写入、事件回放和 snapshot 写入必须复用同一个事务客户端。

## 5. 导出映射

- 会话导出：包含 session、messages、files、skills、agent runs、events、snapshots。
- A2UI JSONL 导出：按 sequence 输出 committed A2UI event messages。
- Snapshot 导出：输出当前 surface snapshot。

## 6. 维护规则

- 修改 Prisma schema 时，同步更新本文档和相关 API DTO。
- 复杂索引或数据库约束如果不适合放入 Prisma schema，应通过 SQL migration 维护，并在本文档说明。
