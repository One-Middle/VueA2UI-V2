# Backend 模块实现详情 v0.1

## 1. 模块概述

`packages/backend` 是 Node.js + Express + Prisma + PostgreSQL 后端服务。提供 REST API、SSE 推送、文件处理、Agent run 编排。

## 2. 文件结构

```text
src/
  app.ts                      # Express 应用入口（路由挂载）
  server.ts                   # 启动入口（Prisma 连接、优雅关闭）
  config.ts                   # 环境变量配置（dotenv）
  logger.ts                   # Pino 日志
  db.ts                       # PrismaClient 单例
  repositories/
    session.repository.ts     # sessions 表 CRUD
    message.repository.ts     # messages 表 CRUD
    agent-run.repository.ts   # agent_runs 表 CRUD
    a2ui-event.repository.ts  # a2ui_events 表 CRUD + getNextSequence
    surface-snapshot.repository.ts  # surface_snapshots 表 CRUD + unsetCurrent
    file.repository.ts        # uploaded_files 表 CRUD
    skill.repository.ts       # skills 表 CRUD
    session-skill.repository.ts  # session_skills 表 CRUD
    tool-call.repository.ts   # tool_calls 表 CRUD
    renderer-event.repository.ts  # renderer_events 表 CRUD
  services/
    session.service.ts        # 会话创建/列表/详情/更新
    message.service.ts        # 用户消息创建 + Agent run 触发
    agent-run.service.ts      # Agent 执行编排/提交/失败
    stream.service.ts         # SSE 连接管理和事件推送
    file.service.ts           # .txt 文件上传/列表/删除
    skill.service.ts          # Skill CRUD + session_skills 管理
    snapshot.service.ts       # Snapshot 计算/回放
    renderer-event.service.ts # Action/error 记录
    export.service.ts         # 会话/JSONL/snapshot 导出
  routes/
    sessions.ts               # 会话 CRUD API
    messages.ts               # 消息 API + Agent 触发
    agent-runs.ts             # Agent run 查询 API
    stream.ts                 # SSE 连接 API
    files.ts                  # 文件上传 API
    skills.ts                 # Skill CRUD API
    a2ui.ts                   # A2UI events/snapshots API
    renderer.ts               # Action/error 回传 API
    export.ts                 # 导出 API
  utils/
    errors.ts                 # AppError 类 + 工厂函数 + errorHandler 中间件
    pagination.ts             # 分页解析 + PageResult 构建
    validation.ts             # Zod schema + validate 中间件工厂
```

## 3. 架构分层

```
Routes (routes/)  →  Services (services/)  →  Repositories (repositories/)  →  Prisma (db.ts)
      ↓                      ↓                       ↓
  Zod 校验              业务逻辑                Prisma Client
  errorHandler          事务管理                 PostgreSQL
```

## 4. 完整 API 列表

### 会话
| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/sessions` | sessionService.create |
| GET | `/api/sessions` | sessionService.list |
| GET | `/api/sessions/:sessionId` | sessionService.getById |
| PATCH | `/api/sessions/:sessionId` | sessionService.update |

### 消息
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/sessions/:sessionId/messages` | messageService.listBySession |
| POST | `/api/sessions/:sessionId/messages` | messageService.createUserMessageAndAgentRun → 202 |

### Agent Run
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/sessions/:sessionId/agent-runs` | agentRunService.getRuns |
| GET | `/api/sessions/:sessionId/agent-runs/:agentRunId` | agentRunService.getRunDetail |

### 文件
| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/sessions/:sessionId/files` | fileService.upload (multer) |
| GET | `/api/sessions/:sessionId/files` | fileService.listBySession |
| GET | `/api/sessions/:sessionId/files/:fileId` | fileService.getById |
| DELETE | `/api/sessions/:sessionId/files/:fileId` | fileService.delete |

### Skills
| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/skills` | skillService.create |
| GET | `/api/skills` | skillService.list |
| PATCH | `/api/skills/:skillId` | skillService.update |
| POST | `/api/sessions/:sessionId/skills/:skillId/enable` | skillService.enableForSession |
| POST | `/api/sessions/:sessionId/skills/:skillId/disable` | skillService.disableForSession |

### A2UI
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/sessions/:sessionId/a2ui-events` | a2uiEventRepository.findBySessionId |
| GET | `/api/sessions/:sessionId/surface-snapshots` | surfaceSnapshotRepository.findBySessionId |
| GET | `/api/sessions/:sessionId/surface-snapshots/current` | surfaceSnapshotRepository.findCurrentBySessionId |

### Renderer 回传
| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/sessions/:sessionId/renderer/action` | rendererEventService.recordAction |
| POST | `/api/sessions/:sessionId/renderer/error` | rendererEventService.recordError |

### SSE
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/sessions/:sessionId/stream` | streamService.connect |

### 导出
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/sessions/:sessionId/export` | exportService.exportSession |
| GET | `/api/sessions/:sessionId/export/a2ui.jsonl` | exportService.exportA2UIJSONL |
| GET | `/api/sessions/:sessionId/export/snapshot.json` | exportService.exportSnapshot |

### Runtime
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/runtime/config` | 直接返回 config 对象 |
| PATCH | `/api/runtime/config` | (预留) |

## 5. 关键事务边界

### 成功提交 Agent run（agentRunService.commitRun）

在一个 Prisma 事务中完成 9 步操作：

1. 创建 assistant message（role="assistant", kind="chat"）
2. 计算 sequence = (当前最大) + 1
3. 创建 a2ui_event（status="committed", messages, validationResult）
4. 关联 a2uiEventIds 到 assistant message
5. 回放所有 events 计算 snapshot
6. unset 旧 current snapshot（isCurrent = false）
7. 创建新 snapshot（isCurrent = true）
8. 更新 session（currentSnapshotId, lastAgentRunId）
9. 更新 agent_run 为 committed

第 3、5、7 步必须共享同一个 `Prisma.TransactionClient`。`snapshotService.computeFromEvents(sessionId, tx)` 会把该事务客户端继续传给 `a2uiEventRepository.findBySessionId`，确保当前事务刚创建的 committed event 被包含在物化快照中。

**事务提交后**通过 SSE 推送：assistant_message → a2ui_messages → surface_snapshot → agent_run_completed

历史数据如曾受事务可见性问题影响，可执行 `pnpm --filter @a2ui-platform/backend repair:snapshots`。该命令在逐会话事务中从 committed events 重新物化 current snapshot，并只更新内容或统计不一致的快照。

### 失败 Agent run（agentRunService.failRun）

在事务中：
1. 创建 assistant 失败消息（kind="validation_error"）
2. 更新 agent_run 为 failed（failureReason, completedAt）
3. 推送 SSE agent_run_failed

**不创建 a2ui_event 和 surface_snapshot**。

## 6. SSE 事件流

StreamService 维护 `sessionId → Response[]` 映射，支持一个 session 多个 SSE 客户端。

推送的 7 类业务事件：

| 事件 | 触发时机 | 数据 |
|------|---------|------|
| agent_run_started | Agent run 启动 | agentRun.id, status, attemptCount, maxAttempts |
| agent_run_attempt | 每次 validateA2UI 调用 | agentRunId, attemptIndex, phase, toolCall |
| agent_run_completed | Agent 成功提交后 | agentRun.id, status, attemptCount, completedAt |
| assistant_message | Agent 成功提交后 | message.id, role, content |
| a2ui_messages | Agent 成功提交后 | a2uiEvent.id, sequence, messages |
| surface_snapshot | Agent 成功提交后 | snapshot.id, surfaceCount, componentCount |
| agent_run_failed | Agent 失败后 | agentRun.id, failureReason, 失败 message |

心跳每 20 秒发送一次。

## 7. 正式 Agent Runtime

后端通过 `@a2ui-platform/agent` 调用正式 `AgentRuntime.run(input)`：

- 从数据库读取最近消息、上传 `.txt` 文件内容、启用的 skills 和当前 snapshot，组装 `AgentRunInput`。
- 使用环境变量中的 OpenAI-compatible 配置创建 `ModelClient`。
- Runtime 内部执行模型生成、`validateA2UI` 校验和最多 3 次修复循环。
- 每次 `validateA2UI` 调用会写入 `tool_calls`，并通过 SSE 推送 `agent_run_attempt`。
- `COMMITTED` 创建 `a2ui_events` 和 `surface_snapshots`；`TEXT_ONLY` 只创建 assistant message，但同样推送 `agent_run_completed` 结束前端 loading；`FAILED` 创建 `validation_error` message。

## 8. 环境配置

通过 `dotenv` 加载，关键变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3100 | 服务端口 |
| DATABASE_URL | — | PostgreSQL 连接串 |
| OPENAI_COMPAT_BASE_URL | https://api.openai.com/v1 | 模型 API 地址 |
| OPENAI_COMPAT_API_KEY | "" | API 密钥 |
| OPENAI_COMPAT_MODEL | gpt-4.1 | 模型名称 |
| OPENAI_COMPAT_TEMPERATURE | 0.2 | 模型温度 |
| OPENAI_COMPAT_MAX_TOKENS | 8192 | 最大生成 token 数 |
| OPENAI_COMPAT_TIMEOUT_MS | 60000 | 模型请求超时时间，单位毫秒 |

固定 Catalog ID：`https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`

