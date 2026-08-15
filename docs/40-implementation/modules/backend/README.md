# Backend 模块说明

## 1. 功能定位

`packages/backend` 是平台业务后端，负责 HTTP API、PostgreSQL 持久化、SSE 推送、文件处理、Skill 管理、Renderer 回传记录、Agent run 编排、A2UI event 提交和 surface snapshot 物化。

它是 Frontend、Agent、数据库之间的边界层：Frontend 只通过 HTTP/SSE 与它通信；Agent Runtime 只由它注入上下文并调用；Renderer action/error 也先由 Frontend 转交给它记录。

## 2. 技术栈

- 包路径：`packages/backend`
- Runtime：Node.js
- 语言：TypeScript
- Web 框架：Express
- ORM：Prisma
- 数据库：PostgreSQL
- DTO 校验：Zod
- 日志：pino、pino-http（当前 `app.ts` 使用自定义 debug 请求日志中间件）
- 文件上传：multer
- 测试：Vitest、tsc
- 依赖模块：`@a2ui-platform/shared`、`@a2ui-platform/agent`

## 3. 职责边界

负责：

- 注册 API routes。
- 调用 service 完成业务编排。
- 通过 repository 封装 Prisma 数据访问。
- 上传、读取和删除 `.txt` 文件。
- 解析 session 启用的 Skill 和平台默认 Skill。
- 调用 Agent Runtime 并记录工具调用。
- 在事务中提交 assistant message、A2UI event 和 current snapshot。
- 通过 SSE 推送 Agent run、tool call、assistant message、A2UI event 和 snapshot。
- 记录 Renderer action/error。
- 导出会话、A2UI JSONL 和当前 snapshot。

不负责：

- 不直接调用模型 API，模型调用由 `packages/agent` 内部完成。
- 不直接保存或暴露 Model IO trace；本地 JSONL 由 Agent 模块在 backend 进程中写入 `logs/model-io/`。
- 不生成 A2UI 草稿。
- 不实现前端渲染。
- 不执行 Renderer action 的业务副作用。
- 不提供登录鉴权。

## 4. 真实工程结构

```text
packages/backend/
  prisma/
    schema.prisma
  skill-docs/
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
      skill-resolver.service.ts
      skill.service.ts
      snapshot.service.ts
      stream.service.ts
      __tests__/
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
      sync-builtin-skills.ts
      sync-skill-docs.ts
    utils/
      errors.ts
      pagination.ts
      validation.ts
```

## 5. 关键文件职责

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/server.ts` | HTTP 服务启动入口，负责监听和退出处理。 |
| `src/app.ts` | Express app 工厂，注册 CORS、JSON 解析、健康检查、Runtime 配置端点、路由、404 和错误处理。 |
| `src/config.ts` | 读取环境变量，生成模型、Catalog、数据库和 Skill 配置。 |
| `src/db.ts` | Prisma Client 初始化。 |
| `src/routes/*.ts` | 参数和 body 校验层，转发到 service。 |
| `src/services/agent-run.service.ts` | Agent run 核心编排，负责调用 Agent、提交结果、失败处理和 SSE 推送。 |
| `src/services/message.service.ts` | 保存用户消息，并根据消息意图触发 Agent run 或推进 Agent Workflow。 |
| `src/services/workflow.service.ts` | 编排 Agent Workflow、WorkflowStageGate、step 状态和 artifact 版本。 |
| `src/routes/workflows.ts` | 查询 workflow timeline，并接收 `confirm_plan` 等 workflow action。 |
| `src/services/snapshot.service.ts` | 从 committed A2UI events 回放生成 surface snapshot。 |
| `src/services/skill-resolver.service.ts` | 合并 session 启用 Skill 和平台默认 Skill，供 Agent 输入使用。 |
| `src/services/skill.service.ts` | Skill CRUD、Reference metadata、会话启用关系和内置 Skill upsert。 |
| `src/services/stream.service.ts` | 管理 SSE 客户端连接和事件广播。 |
| `src/services/renderer-event.service.ts` | 持久化 Renderer action/error。 |
| `src/services/export.service.ts` | 导出会话、A2UI JSONL 和 snapshot。 |
| `src/repositories/*.ts` | 数据访问层，封装 Prisma CRUD 和查询。 |
| `src/scripts/sync-builtin-skills.ts` | 将 Agent 包内置 Skill 同步到数据库。 |
| `src/scripts/sync-skill-docs.ts` | 将数据库 Skill 镜像到 `skill-docs/`，便于开发查看。 |
| `src/scripts/repair-current-snapshots.ts` | 从 committed events 修复 current snapshot。 |

## 6. 路由能力

| 路由文件 | 主要能力 |
| --- | --- |
| `routes/sessions.ts` | 会话创建、列表、详情、更新、软删除。 |
| `routes/messages.ts` | 消息列表、发送用户消息并触发 Agent run。 |
| `routes/agent-runs.ts` | Agent run 列表和详情，详情包含 tool calls、assistant message、相关 A2UI events。 |
| `routes/files.ts` | `.txt` 文件上传、列表、详情和删除。 |
| `routes/skills.ts` | Skill CRUD、会话启用和禁用。 |
| `routes/a2ui.ts` | A2UI events、surface snapshots 和 current snapshot 查询。 |
| `routes/renderer.ts` | Renderer action/error 回传记录。 |
| `routes/export.ts` | 完整会话、A2UI JSONL、snapshot 导出。 |
| `routes/stream.ts` | 会话级 SSE 连接。 |

`src/app.ts` 还直接提供：

- `GET /api/health`
- `GET /api/runtime/config`

注意：前端 `api.ts` 当前声明了 `PATCH /api/runtime/config`，但后端真实代码只实现了 `GET /api/runtime/config`。

## 7. Agent run 提交流程

1. `messages` 路由接收用户消息。
2. `MessageService` 保存 user message，并先检查当前 session 是否存在 active Agent Workflow。
3. 如果存在 active Agent Workflow，消息会关联到该 workflow，暂不创建新的 Agent run。
4. 如果 active workflow 当前停在 `confirm_plan`，用户自然语言消息会作为 `requestPlanRevision()` 进入 WorkflowStageGate：旧 plan 保留，新 revision 生成新版 plan 或 clarification form。
5. 如果不存在 active Agent Workflow，`MessageService` 根据 intent 和消息内容判断是否启动新的 Agent Workflow。
6. 新 workflow 会立即进入 `startInitialPlanning()`：先创建 `understand` step，再按需求完整度进入 `clarify` 或 `propose` + `confirm_plan`。
7. `confirm_plan` action 会创建用户可见确认 message，确认 plan，并创建 `generate_a2ui` step。
8. `AgentRunService.startWorkflowCandidateRun()` 创建 workflow-scoped Agent run，异步调用 Runtime 生成 Candidate A2UI。
9. Candidate run 成功时只保存 `candidate_a2ui_messages` artifact 并进入 `preview`，失败时保存 `validation_report` artifact。
10. Candidate run 不调用 `commitRun()`，因此不会创建正式 A2UI event 或 current snapshot。
11. `confirm_commit` action 会校验当前 `preview` step 和已验证 candidate artifact，然后把 exact stored candidate messages 提交为正式 A2UI event 和 current snapshot。
12. 提交完成后，workflow 以 `completed` + `committed` 结束，并在 metadata 中记录确认 message、candidate artifact、A2UI event、snapshot 和 assistant message。
13. 普通非 workflow 消息沿用旧路径，创建 pending Agent run。
14. `AgentRunService.executeRun()` 将 run 标记为 running，并推送 `agent_run_started`。
15. 后端读取 current snapshot、最近 20 条消息、ready 文件内容和已解析 Skill。
16. 后端调用 `createAgentRuntime(config).run(input, onToolCall)`。
17. Runtime 回传工具调用时，后端写入 `toolCall` 并推送 `agent_run_attempt`。
18. `COMMITTED` 结果进入同一个 Prisma transaction，创建 assistant message、A2UI event、current snapshot，并更新 run/session。
19. 在 `commitRun()` 的 Prisma transaction callback 内完成写入、DTO 组装和 `assistant_message`、`a2ui_messages`、`surface_snapshot`、`agent_run_completed` 推送。
20. `TEXT_ONLY` 只创建 assistant message 和 committed run，不创建 A2UI event 或 snapshot。
21. `FAILED` 创建 `validation_error` assistant message，标记 run failed，并推送 `agent_run_failed`。

## 8. 事务与一致性约束

- A2UI event 和 snapshot 必须在同一事务中提交，避免刚写入的 event 对事务外连接不可见。
- current snapshot 通过 `surfaceSnapshotRepository.unsetCurrent()` 后写入新 current snapshot。
- 当前 SSE 推送位于写入流程之后、同一个 transaction callback 内；维护时不要把推送提前到 message、event、snapshot 写入之前。
- Agent 失败和 TEXT_ONLY 都不应更新 Renderer 正式状态。

## 9. 测试与验收

- `pnpm --filter @a2ui-platform/backend typecheck`
- `pnpm --filter @a2ui-platform/backend test`
- 成功 Agent run 应产生 assistant message、A2UI event、current snapshot 和完成 SSE。
- TEXT_ONLY run 不应产生 A2UI event/snapshot。
- 失败 run 不应产生 A2UI event/snapshot。
- snapshot 物化应复用当前 Prisma transaction。
- Renderer action/error 应只被记录，不触发额外业务执行。

## 10. 维护规则

- 修改 API 路由时，同步更新 [api.md](../../../30-contracts/api.md) 和 Frontend API client。
- 修改 Prisma schema 或事务边界时，同步更新 [db-schema.md](../../../30-contracts/db-schema.md)。
- 修改 Agent 编排时，同步更新 Agent 和 Integration 文档。
- 修改 SSE 事件时，同步更新 Shared `sse.ts`、Frontend `stream.ts` 和 Runtime 面板展示。
- 修改 Skill 解析或内置 Skill 同步时，同步检查 Agent `registry.ts` 和 `platform-skills.ts`。

## 11. 相关文档

- [API 契约](../../../30-contracts/api.md)
- [DB Schema 契约](../../../30-contracts/db-schema.md)
- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Agent 模块说明](../agent/README.md)
- [Integration 模块说明](../integration/README.md)


