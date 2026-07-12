# Backend 模块说明

## 1. 功能定位

`packages/backend` 是平台业务后端，负责 HTTP API、PostgreSQL 持久化、SSE 推送、文件处理、skills、A2UI events、surface snapshots、Renderer 回传记录和 Agent run 编排。

输入：前端 HTTP/SSE 请求、Renderer action/error、Agent result。  
输出：API 响应、SSE 事件、数据库记录、提交后的 A2UI events 与 snapshots。

## 2. 技术栈

- 包路径：`packages/backend`
- Runtime：Node.js
- 语言：TypeScript
- Web 框架：Express
- ORM：Prisma
- 数据库：PostgreSQL
- DTO 校验：Zod
- 日志：pino、pino-http
- 文件上传：multer
- 测试：Vitest、tsc
- 依赖模块：`@a2ui-platform/shared`、`@a2ui-platform/agent`

## 3. 职责边界

负责：

- API routes/controllers。
- Prisma repositories。
- 业务 services。
- `.txt` 文件上传、读取和保存。
- 调用 Agent Runtime。
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

## 4. 代码工程结构

```text
packages/backend/
  prisma/
    schema.prisma
  src/
    app.ts
    config.ts
    db.ts
    logger.ts
    server.ts
    routes/
      a2ui.ts
      agent-runs.ts
      export.ts
      files.ts
      messages.ts
      renderer.ts
      sessions.ts
      skills.ts
      stream.ts
    services/
      agent-run.service.ts
      export.service.ts
      file.service.ts
      message.service.ts
      renderer-event.service.ts
      session.service.ts
      skill.service.ts
      snapshot.service.ts
      snapshot.service.test.ts
      stream.service.ts
    repositories/
      a2ui-event.repository.ts
      agent-run.repository.ts
      file.repository.ts
      message.repository.ts
      renderer-event.repository.ts
      session-skill.repository.ts
      session.repository.ts
      skill.repository.ts
      surface-snapshot.repository.ts
      tool-call.repository.ts
    scripts/
      repair-current-snapshots.ts
    utils/
      errors.ts
      pagination.ts
      validation.ts
```

## 5. 文件职责说明

| 文件 / 目录 | 作用 |
| --- | --- |
| `prisma/schema.prisma` | Prisma 数据模型定义。 |
| `src/server.ts` | 后端启动入口，启动 HTTP 服务并处理退出。 |
| `src/app.ts` | Express app 组装，中间件和路由注册。 |
| `src/config.ts` | 环境变量读取和运行配置。 |
| `src/db.ts` | Prisma Client 初始化。 |
| `src/logger.ts` | pino 日志实例。 |
| `src/routes/*.ts` | Express 路由层，负责参数/body 校验和调用 service。 |
| `src/services/*.ts` | 业务编排层，负责事务、Agent 调用、SSE 推送和导出等流程。 |
| `src/repositories/*.ts` | 数据访问层，封装 Prisma CRUD。 |
| `src/utils/errors.ts` | 统一错误类型和错误响应辅助。 |
| `src/utils/pagination.ts` | 分页参数和分页响应辅助。 |
| `src/utils/validation.ts` | Zod 校验辅助。 |
| `src/scripts/repair-current-snapshots.ts` | 从 committed A2UI events 修复 current snapshot 的维护脚本。 |

## 6. 路由职责

| 文件 | 作用 |
| --- | --- |
| `routes/sessions.ts` | 会话创建、查询、详情和更新。 |
| `routes/messages.ts` | 消息列表和发送用户消息，触发 Agent run。 |
| `routes/agent-runs.ts` | Agent run 列表和详情。 |
| `routes/files.ts` | `.txt` 文件上传、列表、详情和删除。 |
| `routes/skills.ts` | Skill CRUD 与会话启用/禁用。 |
| `routes/a2ui.ts` | A2UI events 和 surface snapshots 查询。 |
| `routes/renderer.ts` | Renderer action/error 回传。 |
| `routes/export.ts` | 会话、A2UI JSONL 和 snapshot 导出。 |
| `routes/stream.ts` | 会话级 SSE 连接。 |

## 7. Service 职责

| 文件 | 作用 |
| --- | --- |
| `agent-run.service.ts` | Agent run 编排、成功提交事务和失败处理。 |
| `message.service.ts` | 用户消息创建、assistant 消息保存和发送流程。 |
| `snapshot.service.ts` | A2UI events 回放与 surface snapshot 物化。 |
| `snapshot.service.test.ts` | snapshot 物化测试。 |
| `stream.service.ts` | SSE 客户端管理和事件广播。 |
| `session.service.ts` | 会话查询、创建、更新和详情聚合。 |
| `file.service.ts` | 上传文件校验、保存、读取和删除。 |
| `skill.service.ts` | Skill 管理和会话启用关系。 |
| `renderer-event.service.ts` | Renderer action/error 持久化。 |
| `export.service.ts` | 会话、JSONL 和 snapshot 导出。 |

## 8. 核心流程

Agent 成功提交：

1. `messages` 路由接收用户消息。
2. `MessageService` 保存用户消息并创建 Agent run。
3. `AgentRunService` 调用 `packages/agent`。
4. Agent 返回合法 A2UI messages。
5. 后端在单个事务内写入 run、assistant message、event、snapshot。
6. 事务提交后通过 `StreamService` 推送 SSE。

## 9. 依赖契约

- API：[../contracts/api.md](../contracts/api.md)
- DB：[../contracts/db-schema.md](../contracts/db-schema.md)
- A2UI：[../contracts/a2ui-v0.9.md](../contracts/a2ui-v0.9.md)
- Agent：[./agent.md](./agent.md)

## 10. 测试与验收

- `pnpm --filter @a2ui-platform/backend typecheck`
- `pnpm --filter @a2ui-platform/backend test`
- 成功 Agent run 产生 message、event、snapshot。
- 失败 Agent run 不产生 event/snapshot。
- 事务内 snapshot 生成复用同一个 Prisma 事务客户端。
- SSE 只在事务提交后发送。

## 11. 维护规则

- 修改 API 路由时，同步更新 `docs/contracts/api.md`。
- 修改 Prisma schema 或事务边界时，同步更新 `docs/contracts/db-schema.md`。
- 修改 Agent 编排时，同步更新 `docs/modules/agent.md` 和 `docs/modules/integration.md`。
