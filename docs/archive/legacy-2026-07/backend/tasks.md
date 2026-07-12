# Backend 模块任务清单 v0.1

## 1. 模块边界

本任务清单只覆盖 `backend`。Agent Runtime 的模型调用和校验循环在 `docs/agent/tasks.md` 中实现。

## 2. 依赖契约

必须遵守：

- `docs/product/agent-platform-api.md`
- `docs/product/agent-platform-db-schema.md`
- `docs/development-start.md`
- `docs/backend/backend-implementation.md`

可并行前置条件：

- `agent` 可先用 mock。
- `frontend` 可先用 API mock。

## 3. 任务列表

### TASK-BE-001：后端基础结构与错误响应

- 目标：建立 routes/controllers/services/repositories 基础结构。
- 依赖任务：无。
- 涉及文件区域：`packages/backend/src`。
- 实现要求：使用 Express + TypeScript；统一 `{ error: { code, message, details } }`；日志使用 pino。
- 验收标准：未知路由和业务错误格式一致。
- 测试要求：错误响应测试。
- 不允许做什么：不实现临时非文档 API。

### TASK-BE-002：数据库迁移

- 目标：按 DB Schema 创建 Prisma schema、Prisma migrate 和必要 SQL migration。
- 依赖任务：无。
- 涉及文件区域：`packages/backend/prisma`、`packages/backend/src/db`。
- 实现要求：包含 sessions、messages、uploaded_files、skills、session_skills、agent_runs、tool_calls、a2ui_events、surface_snapshots、renderer_events；复杂外键、partial index 用 SQL migration 补充。
- 验收标准：迁移可在空库成功执行。
- 测试要求：迁移 smoke test。
- 不允许做什么：不新增 schema 文档未定义字段。

### TASK-BE-003：Repositories

- 目标：实现核心表数据访问。
- 依赖任务：TASK-BE-002。
- 涉及文件区域：`packages/backend/src/repositories`。
- 实现要求：基于 Prisma Client 实现基础 CRUD 和常用查询。
- 验收标准：服务层可通过 repository 读写数据。
- 测试要求：repository 单元或集成测试。
- 不允许做什么：不在 controller 中写 SQL。

### TASK-BE-004：Session API

- 目标：实现会话创建、列表、详情、更新。
- 依赖任务：TASK-BE-003。
- 涉及文件区域：`packages/backend/src/controllers`、`packages/backend/src/services`。
- 实现要求：使用 Zod 校验 DTO；默认填充固定 Catalog 和 rendererVersion。
- 验收标准：API 文档中 session 示例可用。
- 测试要求：创建、列表、详情、归档。
- 不允许做什么：不加入登录逻辑。

### TASK-BE-005：Message API 与 Agent run 创建

- 目标：发送消息后创建 user message 和 pending agent run。
- 依赖任务：TASK-BE-004。
- 涉及文件区域：`packages/backend/src/services/MessageService`、`packages/backend/src/services/AgentRunService`。
- 实现要求：使用 Zod 校验请求；返回 `202` 和 streamUrl。
- 验收标准：发送消息后 DB 有 message 和 agent_run。
- 测试要求：空消息失败、归档 session 失败。
- 不允许做什么：不在该任务调用真实模型。

### TASK-BE-006：SSE StreamService

- 目标：实现会话级 SSE 连接和事件推送。
- 依赖任务：TASK-BE-004。
- 涉及文件区域：`packages/backend/src/stream`。
- 实现要求：支持 heartbeat 和业务事件。
- 验收标准：前端可连接并收到 heartbeat。
- 测试要求：连接、断开、发送事件。
- 不允许做什么：不通过 SSE 发送未校验草稿。

### TASK-BE-007：Agent mock 编排

- 目标：用 mock agent 结果打通成功/失败提交流程。
- 依赖任务：TASK-BE-005、TASK-BE-006。
- 涉及文件区域：`packages/backend/src/services/AgentRunService`。
- 实现要求：成功时提交 event/snapshot；失败时只写失败消息。
- 验收标准：无真实模型也能端到端更新前端。
- 测试要求：成功事务、失败事务。
- 不允许做什么：不跳过事务边界。

### TASK-BE-008：SurfaceSnapshotService

- 目标：根据 committed A2UI events 计算 snapshot。
- 依赖任务：TASK-BE-003。
- 涉及文件区域：`packages/backend/src/services/SurfaceSnapshotService`。
- 实现要求：维护 surfaces、components、dataModel。
- 验收标准：create/update/delete 消息后 snapshot 正确。
- 测试要求：协议事件回放测试。
- 不允许做什么：不渲染 UI。

### TASK-BE-009：文件 API

- 目标：上传、列表、详情、删除 `.txt` 文件。
- 依赖任务：TASK-BE-003、TASK-BE-004。
- 涉及文件区域：`packages/backend/src/files`。
- 实现要求：使用 multer 处理 multipart；使用 Zod/业务校验扩展名、大小、UTF-8 内容。
- 验收标准：上传后可被消息附件引用。
- 测试要求：非 txt、超大文件、读取失败。
- 不允许做什么：不允许任意路径读取。

### TASK-BE-010：Skills API

- 目标：创建、更新、启用、禁用 skill。
- 依赖任务：TASK-BE-003、TASK-BE-004。
- 涉及文件区域：`packages/backend/src/services/SkillService`。
- 实现要求：维护 skills 和 session_skills。
- 验收标准：会话启用 skills 可查询。
- 测试要求：启用、禁用、重复启用。
- 不允许做什么：不执行 skill。

### TASK-BE-011：Renderer event API

- 目标：记录 action/error。
- 依赖任务：TASK-BE-003、TASK-BE-004。
- 涉及文件区域：`packages/backend/src/services/RendererEventService`。
- 实现要求：使用 Zod 校验 API body；A2UI client-to-server 结构可结合 Ajv 校验。
- 验收标准：action/error 入库。
- 测试要求：非法 action 被拒绝。
- 不允许做什么：MVP 不触发新 Agent run。

### TASK-BE-012：导出 API

- 目标：导出 session、A2UI JSONL、snapshot。
- 依赖任务：TASK-BE-003。
- 涉及文件区域：`packages/backend/src/export`。
- 实现要求：符合 API 文档内容格式。
- 验收标准：下载文件内容正确。
- 测试要求：空会话、有 events、有 snapshot。
- 不允许做什么：不导出 API key。
