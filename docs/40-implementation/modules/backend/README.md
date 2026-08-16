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
      workflow.repository.ts
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
| `src/services/workflow.service.ts` | 编排 Agent Workflow 全流程：创建 workflow、plan / generate_a2ui / validate / preview / commit step 推进、artifact 版本、失败重试，并调用 `runWorkflowTask` 执行 ReAct task、回写 Resource Ledger。 |
| `src/routes/workflows.ts` | 查询 workflow timeline / 详情，并接收 `submit_clarification`、`submit_decision`、`retry_step`、`cancel` 等 workflow action。 |
| `src/repositories/workflow.repository.ts` | AgentWorkflow / WorkflowStep / WorkflowArtifact 三张表的数据访问层。 |
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
| `routes/messages.ts` | 消息列表、发送用户消息并按 UI 生成意图触发 workflow 或 Agent run。 |
| `routes/agent-runs.ts` | Agent run 列表和详情，详情包含 tool calls、assistant message、相关 A2UI events 和 ReAct trace summary。 |
| `routes/workflows.ts` | workflow 历史/详情查询，以及 workflow action 提交。 |
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

### 7.1 Agent Workflow 流程

1. `MessageService.createUserMessageAndAgentRun` 收到用户消息，先检查 session 是否已有 active workflow；否则用 UI 生成意图正则或前端 `intent` 判断是否新建 workflow。
2. 新建 workflow 后立即 `startInitialPlanning()`：创建一个 `plan` step，通过 `runWorkflowTask(task="plan")` 用 ReAct 循环生成 clarification form 或 Markdown plan + decision form。
3. 若返回 clarification form，step 进入 `awaiting_confirmation + awaiting_clarification`，保存 `clarification_form` artifact。
4. 若返回 plan，step 进入 `awaiting_confirmation + awaiting_plan_confirmation`，保存 `plan_markdown` 与 `decision_form` artifact（decision 回填 `targetArtifactId`）。
5. `submit_clarification` action 重新运行 `task="plan"`（带 `clarificationAnswers`），生成新版 plan 或 clarification。
6. `submit_decision` 在 `plan + awaiting_plan_confirmation` 下：`confirm` 完成 plan 并创建 `generate_a2ui` step；`revise` 走 `requestPlanRevision()` 生成新版 plan；`reject` 停留。
7. `executeGenerateA2UI()` 通过 `runWorkflowTask(task="generate_a2ui")` 生成 candidate，然后在独立的 `validate` step 里用后端 `validateA2UI` 二次校验，保存 `validation_report` artifact。
8. 校验通过后保存 `candidate_a2ui_messages` artifact，并 `createPreviewDecision()` 用 `runWorkflowTask(task="preview_decision")` 生成 decision form，进入 `preview + awaiting_preview_confirmation`。
9. `submit_decision` 在 `preview + awaiting_preview_confirmation` 下：`confirm` 走 `confirmCandidateCommit()` + `commitExactCandidate()` 提交 exact stored candidate；`revise` 走 `requestPreviewRevision()` 回到新的 `plan` 轮次（旧 candidate 标记 `invalidated`）。
10. `commitExactCandidate()` 在单个 Prisma 事务内创建 assistant message、A2UI event、current snapshot，完成 commit step 和 workflow。
11. `retry_step` 只支持重试最新失败的 `generate_a2ui` step，创建新 `generate_a2ui` step 并复用已确认 plan 重新生成。
12. 每个 workflow task 通过 `runWorkflowTask` 的第三个回调把 ReAct trace 事件转发为 `agent_trace_event` SSE；trace summary 写入 `agent_runs.metadata.traceSummary`，Resource Ledger snapshot 写回 `agent_workflows.metadata.resourceLedger`。

### 7.2 普通 Agent Run 流程

1. 非 workflow 消息创建 pending Agent run。
2. `AgentRunService.executeRun()` 将 run 标记为 running，并推送 `agent_run_started`。
3. 后端读取 current snapshot、最近 20 条消息、ready 文件内容和已解析 Skill。
4. 后端调用 `createAgentRuntime(config).run(input, onToolCall)`。
5. Runtime 回传工具调用时，后端写入 `toolCall` 并推送 `agent_run_attempt`。
6. `COMMITTED` 结果进入同一个 Prisma transaction，创建 assistant message、A2UI event、current snapshot，并更新 run/session，推送 `assistant_message`、`a2ui_messages`、`surface_snapshot`、`agent_run_completed`。
7. `TEXT_ONLY` 只创建 assistant message 和 committed run，不创建 A2UI event 或 snapshot。
8. `FAILED` 创建 `validation_error` assistant message，标记 run failed，并推送 `agent_run_failed`。

## 8. 事务与一致性约束

- A2UI event 和 snapshot 必须在同一事务中提交，避免刚写入的 event 对事务外连接不可见。
- current snapshot 通过 `surfaceSnapshotRepository.unsetCurrent()` 后写入新 current snapshot。
- 当前 SSE 推送位于写入流程之后、同一个 transaction callback 内；维护时不要把推送提前到 message、event、snapshot 写入之前。
- Agent 失败和 TEXT_ONLY 都不应更新 Renderer 正式状态。
- workflow 的 candidate 会被校验两次：先由 ReAct executor 的 `finalizeDraft` 强制 `validateA2UI`，再在 backend 的 `validate` step 里二次校验；两处共用同一 `validateA2UI` 工具。

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

已知差异：

- `agent-run.service.ts` 中的 `startWorkflowCandidateRun` / `executeWorkflowCandidateRun` / `commitWorkflowCandidate`，以及 `workflow.service.ts` 中的 `recordCandidateSuccess` / `recordCandidateFailure` / `confirmPlan`，是旧 async candidate run 路径与旧 `confirm_plan` 模型的遗留代码，当前路由已不再调用；candidate 生成统一走 `workflowService.executeGenerateA2UI()`。
- 普通 Agent run 的 `run()` 与 workflow task 的 `runWorkflowTask()` 共用 `buildAgentInput`，但后者额外携带 `gate` / `stepType` / `stageState` / `task` / `availableTools` 等 workflow 上下文。

## 11. 相关文档

- [API 契约](../../../30-contracts/api.md)
- [DB Schema 契约](../../../30-contracts/db-schema.md)
- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Agent 模块说明](../agent/README.md)
- [Integration 模块说明](../integration/README.md)


