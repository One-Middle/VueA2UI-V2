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
- `agent_engine_bindings`（planned）：workflow 固定使用的引擎、兼容版本、配置指纹与不透明 continuation。
- `agent_engine_events`（planned）：一次 AgentRun 的引擎无关语义事件、原生摘要和失败诊断 payload。
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
- 一个 session 可以保留多次 Agent Workflow 历史，但同一时刻只能有一个处于 active、running、awaiting confirmation、retryable 或 interrupted 状态的 workflow。
- Agent run 和用户可见 message 可以关联到 workflow 和 workflow step，便于恢复完整 workflow timeline。
- `failed_retryable` workflow 收到新的普通用户 message 时，可以复用最新失败 step 恢复执行；新的 Agent run 绑定原 `workflowStepId` 和新 `triggerMessageId`，`workflow_steps.attempt_count` 递增记录同一阶段的尝试次数。
- `interrupted` workflow 收到新的非空普通用户 message 时，可以复用当前 interrupted step 继续执行；新的 Agent run 绑定原 `workflowStepId` 和新 `triggerMessageId`，旧 Agent run 保持 `cancelled`。
- Candidate A2UI 只能作为 workflow artifact 保存；用户确认提交前不得写入 A2UI events 或 surface snapshots。
- `workflow_steps.type` 集合为 `plan`、`generate_a2ui`、`validate`、`preview` 和 `commit`。
- `workflow_steps.stage_state` 是主状态字段，用于保存领域等待态：`awaiting_clarification`、`awaiting_plan_confirmation`、`awaiting_preview_confirmation` 或 `null`。该字段是独立列，不放 `metadata`。
- `workflow_artifacts.kind` 集合为 `clarification_form`、`decision_form`、`plan_markdown`、`candidate_a2ui_messages` 和 `validation_report`。
- `workflow_artifacts` 只保存 Parsed Agent Result 或后端校验后的稳定产物，raw Agent Output 不得写入 artifact content。
- `decision_form.metadata` 至少保存 `source: "askUserDecision"`、`agentRunId` 和 `toolCallId`，形成 `decision_form artifact -> tool_call` 的单向关联。
- `candidate_a2ui_messages` 只能在 `validate` 通过后保存；validate 失败时只保存 `validation_report`。
- `agent_workflows.metadata.resourceLedger` 保存跨 task 共享的 Resource Ledger Snapshot（已披露 Skill / Reference 的键与元信息，不含正文）。
- ReAct 兼容期可继续使用 `agent_runs.metadata.traceSummary` 保存既有 trace 摘要；新增引擎事件使用 `agent_engine_events`，实时主事件为 `agent_engine_event`。
- `agent_workflows.status` 和 `workflow_steps.status` 可取 `interrupted`，表示用户或运行环境中断当前执行但 workflow 可继续。
- `agent_runs.status` 可取 `cancelled`，表示该次 AgentRun 被用户主动停止或被系统中断。
- interruption reason 第一版写入 `agent_workflows.metadata.interruptionReason`、`workflow_steps.metadata.interruptionReason` 和必要的 `agent_runs.metadata.interruptionReason`，不新增独立列。

## 3.1 Agent Engine 持久化（planned）

### `agent_engine_bindings`

每个 workflow 恰有一条 binding，在 workflow 创建时写入且不得更换引擎。字段为：

- `id`、`workflow_id`（唯一外键）、`session_id`、`engine_id`、`plugin_version`。
- `config`：adapter 不透明 JSON；仅可保存环境变量名、密钥引用或非敏感配置，禁止实际密钥。
- `config_fingerprint`：由 adapter 配置计算的不可逆审计指纹，不得包含密钥明文。
- `continuation`：adapter 不透明 JSON；可为 `null`，只允许同 `engine_id` 与兼容插件版本读取。
- `created_at`、`updated_at`、`deleted_at`。

约束与索引：

- `workflow_id` 唯一；`session_id, engine_id` 与 `engine_id, plugin_version` 建索引，支持运行审计和发布排查。
- workflow 创建后，`engine_id`、`plugin_version` 和 `config_fingerprint` 不可更新；continuation 只能由该 workflow 的成功或可恢复运行更新。
- 平台不得查询、解释或迁移 `config`、`continuation` 的内部字段。跨引擎或不兼容版本恢复必须拒绝，改为新的 retry 或重新开始。

### `agent_engine_events`

每项对应一个 AgentRun 内的 SPI 语义事件。字段为：

- `id`、`agent_run_id`（外键）、`session_id`、`workflow_id`、`sequence`、`event_type`、`occurred_at`。
- `summary`：脱敏 JSON 摘要；`native_summary`：可选的脱敏原生事件摘要。
- `failure_native_payload_encrypted`：仅失败运行可写入的加密完整原生 payload；正常运行必须为 `null`。
- `payload_expires_at`：失败完整 payload 的过期时间，固定为写入后 7 天；其他列长期保留遵循 AgentRun 的保留策略。
- `created_at`、`deleted_at`。

约束与索引：

- `agent_run_id, sequence` 唯一，保证单次运行事件顺序。
- `agent_run_id, created_at`、`workflow_id, created_at` 与 `payload_expires_at` 建索引，支持 timeline 查询和过期清理。
- 完整 native payload 必须经应用层信封加密后写入；密钥由受控密钥管理系统提供，不存入本表、workflow metadata 或日志。
- 诊断读取仅限具备受限运维权限的服务端角色；普通 API、SSE、导出和前端查询只能读取 `summary` 与 `native_summary`。
- 每日清理任务删除 `payload_expires_at <= now()` 的完整加密 payload，并保留语义事件行和脱敏摘要；删除操作必须可审计。

## 3.2 Agent Workflow 状态机

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

`interrupted` 状态：

- 用户 `cancel` action 中断 running workflow 时，当前 AgentRun 置为 `cancelled`，当前 workflow 和 step 置为 `interrupted`。
- `interrupted` 不等同于 `failed_retryable`。它不是模型失败，也不触发失败重试文案。
- `interrupted` 不等同于 `cancelled` workflow 终态。用户后续发送非空普通消息时，后端应在同一 workflow 和 step 上创建新的 AgentRun 继续。
- 取消不会删除已持久化 artifact；后续新 candidate 仍通过 freshness guard 和失效标记处理旧 candidate。

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
