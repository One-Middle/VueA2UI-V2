# Backend 模块实现说明 v0.1

## 1. 模块定位

`backend` 是平台业务后端，负责 HTTP API、PostgreSQL 持久化、SSE 推送、文件处理、skills、A2UI events、surface snapshots 和 Agent run 编排。

## 2. 输入文档

- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-db-schema.md`
- `docs/product/agent-platform-api.md`
- `docs/development-start.md`
- `docs/backend/tasks.md`

## 3. 已确定技术选型

- 包路径：`packages/backend`
- Runtime：Node.js
- 语言：TypeScript
- Web 框架：Express
- ORM：Prisma
- 数据库：PostgreSQL
- 数据库迁移：Prisma migrate + 必要 SQL migration
- API DTO 校验：Zod
- A2UI JSON Schema 校验：Ajv
- 日志库：pino
- 文件上传中间件：multer
- 测试：Vitest

实现约束：

- Controller 层使用 Zod 校验请求参数和 body。
- A2UI 协议和 Catalog JSON Schema 校验使用 Ajv。
- 文件上传必须使用 multer 或基于 multer 的封装。
- 日志统一使用 pino，不直接散落 `console.log`。
- Prisma schema 必须与 `docs/product/agent-platform-db-schema.md` 保持一致；partial index 或复杂约束可通过 SQL migration 补充。

## 4. 职责边界

负责：

- API controllers。
- PostgreSQL repositories。
- 业务 services。
- `.txt` 文件读取和保存。
- 调用 `agent` 模块。
- 保存通过校验的 A2UI events。
- 计算并保存 surface snapshots。
- 发送 SSE 事件。
- 记录 Renderer action/error。

不负责：

- 不直接调用 OpenAI-compatible API。
- 不生成 A2UI 草稿。
- 不绕过 `validateA2UI` 提交模型输出。
- 不实现前端渲染。
- 不做登录。

## 5. 服务分层

```text
routes/controllers
  -> services
    -> repositories
      -> PostgreSQL
```

核心 services：

- `SessionService`
- `MessageService`
- `FileService`
- `SkillService`
- `AgentRunService`
- `A2UIEventService`
- `SurfaceSnapshotService`
- `RendererEventService`
- `ExportService`
- `StreamService`

## 6. 事务边界

Agent 成功提交时，必须在一个事务内：

1. 更新 `agent_runs.status = committed`。
2. 创建 assistant message。
3. 创建 A2UI event。
4. 创建 surface snapshot。
5. 更新 current snapshot。
6. 更新 session last run。

事务提交后才能发送 SSE。

## 7. 验收标准

- API 符合 `agent-platform-api.md`。
- DB 字段符合 `agent-platform-db-schema.md`。
- 成功 Agent run 产生 message、event、snapshot。
- 失败 Agent run 不产生 event/snapshot。
- SSE 可推送 run 状态和 A2UI messages。
