# 数据库契约

## 1. 定位

本文档是 PostgreSQL / Prisma 数据模型的唯一权威入口。实际 schema 位于 `packages/backend/prisma/schema.prisma`，两者必须保持一致。

历史完整数据库设计稿已归档到 `docs/archive/product/db-schema.md`；如需要恢复详细字段说明，应迁移到本文档。

## 2. 核心表

- `sessions`：一次 UI 创作上下文。
- `messages`：用户和 assistant 的自然语言消息。
- `uploaded_files`：用户上传的 `.txt` 文件。
- `skills`：可注入 Agent 上下文的文本说明。
- `session_skills`：会话与 skill 的启用关系。
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
