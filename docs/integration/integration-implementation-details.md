# 集成实现详情 v0.1

## 1. 概述

本文档描述 `frontend`、`renderer`、`backend`、`agent` 四个模块之间的集成点、数据流和端到端链路。

## 2. 端到端数据流（成功路径）

```
用户输入 → Frontend API → Backend POST /messages
                              ↓
                         创建 user message + pending agent_run
                              ↓
                         返回 202 + streamUrl
                              ↓
                         异步执行 AgentRuntime.run()
                              ↓
                         validateA2UI 校验通过
                              ↓
                         事务提交（message + event + snapshot + session 更新）
                              ↓
                         SSE 推送 assistant_message + a2ui_messages + surface_snapshot
                              ↓
Frontend SSE 接收 → workspace store 更新
                              ↓
                         renderer.processMessages()
                              ↓
                         SurfaceGroupModel + MessageProcessor
                              ↓
                         A2uiSurface → A2uiComponent → Basic Catalog 组件渲染
```

## 3. 端到端数据流（失败路径）

```
AgentRuntime.run() → 3 次 attempt 全部校验失败
                              ↓
                         返回 FAILED
                              ↓
                         failRun()：创建 validation_error message + 标记 run=failed
                              ↓
                         SSE 推送 agent_run_failed
                              ↓
Frontend 显示失败消息（不更新 Renderer）
```

## 4. 模块集成点

### 4.1 Frontend ↔ Backend

**HTTP API**：
- Frontend `services/api.ts` → Backend `routes/*.ts` → Services → Repositories → Prisma
- 所有 DTO 从 `@a2ui-platform/shared` 引用

**SSE**：
- Frontend `services/stream.ts` 使用 `fetch + ReadableStream` 解析 SSE 帧
- Backend `services/stream.service.ts` 管理 session 级 SSE 连接映射
- SSE 事件类型从 `@a2ui-platform/shared` 的 `PlatformSseEvent` 导入
- 心跳 20 秒，自动重连（最多 5 次，延迟 3 秒）

### 4.2 Backend ↔ Agent

**接口**：
- Backend 构建 `AgentRunInput` → 调用 `AgentRuntime.run(input)`
- Agent 返回 `AgentRunResult`（COMMITTED | TEXT_ONLY | FAILED）
- 类型从 `@a2ui-platform/shared` 的 `AgentRunInput`、`AgentRunResult` 导入

**配置传递**：
- catalogId、catalogVersion、rendererVersion 从 backend config 传入
- model 配置（provider、name、config）从环境变量传入
- 文件内容、skills 内容由 backend 从数据库读取后注入

### 4.3 Renderer ↔ Frontend

**消息传递**：
- Frontend SSE handler 收到 `a2ui_messages` → `rendererStore.processMessages(msgs)`
- PreviewPanel 创建 `SurfaceGroupModel` + `MessageProcessor`，渲染 `<A2uiSurface>`

**Action 回传**：
- Basic Catalog 组件（如 Button）通过 `window.dispatchEvent(new CustomEvent("a2ui:action", ...))` 派发
- Frontend 监听事件 → `api.recordAction(sessionId, action)` → Backend renderer_events 表

## 5. 关键数据契约

### A2UI Server Message
```typescript
type A2UIServerMessage =
  | { version: "v0.9"; createSurface: { surfaceId; catalogId; ... } }
  | { version: "v0.9"; updateComponents: { surfaceId; components: [...] } }
  | { version: "v0.9"; updateDataModel: { surfaceId; path?; value? } }
  | { version: "v0.9"; deleteSurface: { surfaceId } }
```

### Agent Run Result
```typescript
type AgentRunResult =
  | { status: "COMMITTED"; assistantMessage; a2uiMessages; attemptCount; validation; ... }
  | { status: "TEXT_ONLY"; assistantMessage; a2uiMessages: []; attemptCount; ... }
  | { status: "FAILED"; assistantMessage; attemptCount; failureReason; ... }
```

### SSE Events
- `heartbeat`、`agent_run_started`、`agent_run_attempt`、`assistant_message`、`a2ui_messages`、`surface_snapshot`、`agent_run_failed`

## 6. 正式端到端链路

当前链路依赖正式 Agent Runtime 和 OpenAI-compatible API：

1. 后端组装 `AgentRunInput`，包含最近消息、上传文件、启用 skills 和当前 snapshot。
2. `AgentRuntime.run()` 调用模型生成 A2UI 草稿，并执行 `validateA2UI` 校验与修复循环。
3. 完整走通：用户消息 → API → AgentRuntime.run → validateA2UI → 事务提交 → SSE → Frontend → Renderer。

### 验收标准
- 用户创建会话 → 发送消息 → 收到 a2ui_messages → Renderer 渲染 UI
- UI 根据真实模型输出渲染，并且只接收后端校验通过的 A2UI messages

## 7. 文件进入 Agent 上下文

1. 用户上传 `.txt` 文件（Frontend 先验证扩展名 → Backend multer 接收 → UTF-8 读取 → 存入 uploaded_files）
2. 发送消息时可携带 `attachmentFileIds`
3. Backend 查询文件内容，注入到 `AgentRunInput.uploadedFiles`
4. Agent ContextBuilder 截断过长的文件内容（8000 字符/文件）
5. 模型只看到注入的内容，不能读取任意路径

## 8. Renderer Action 回传

1. 用户点击 A2UI Button → ComponentContext.dispatchAction()
2. 通过 `window.dispatchEvent(new CustomEvent("a2ui:action", ...))` 派发
3. Frontend 调用 `api.recordAction(sessionId, action)` → Backend renderer_events 表
4. MVP 不做进一步处理（后续版本可触发新的 Agent run）

## 9. 导出链路

- **会话 JSON**：查询所有关联表 → ExportSessionDto → JSON download
- **A2UI JSONL**：按 sequence 展开 a2ui_events.messages → 每行一个 A2UI 消息 → `application/x-ndjson`
- **Snapshot JSON**：导出当前 isCurrent snapshot → JSON download
