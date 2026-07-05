# 全栈 Agent 平台 API 设计 v0.1

## 1. 设计目标

本文档定义全栈 Agent 平台 MVP 阶段的 HTTP API 与 SSE 事件。API 服务由 `backend` 提供，服务对象主要是 `frontend` 工作台和 `frontend/renderer`。

MVP 约束：

- 不做登录和用户权限。
- 不提供外部 HTTP/API 工具。
- Catalog 固定，但所有会话与产物都返回 `catalogId` 和 `catalogVersion`。
- 模型生成阶段不直接向 Renderer 流式输出。
- 只有通过 `validateA2UI` 的 A2UI 消息才会通过 API/SSE 返回给前端。

## 2. 通用约定

### 2.1 Base URL

```text
/api
```

### 2.2 数据格式

请求与响应默认使用 JSON：

```http
Content-Type: application/json
Accept: application/json
```

文件上传使用：

```http
Content-Type: multipart/form-data
```

SSE 使用：

```http
Accept: text/event-stream
```

### 2.3 时间格式

所有时间字段使用 ISO 8601 字符串：

```text
2026-07-05T13:43:49.000Z
```

### 2.4 ID 格式

所有业务 ID 使用 UUID 字符串。

### 2.5 分页

列表接口默认支持：

```text
?limit=50&cursor=...
```

响应格式：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

MVP 可以先用基于 `createdAt` 或 `sequence` 的 cursor。后续需要稳定翻页时可改为 opaque cursor。

### 2.6 标准错误响应

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "请求参数不合法",
    "details": {}
  }
}
```

常见 HTTP 状态：

- `200 OK`：请求成功。
- `201 Created`：资源创建成功。
- `202 Accepted`：异步任务已接受。
- `400 Bad Request`：请求参数错误。
- `404 Not Found`：资源不存在。
- `409 Conflict`：状态冲突。
- `413 Payload Too Large`：上传内容过大。
- `422 Unprocessable Entity`：语义校验失败。
- `500 Internal Server Error`：服务端错误。

## 3. 核心数据对象

### 3.1 Session

```json
{
  "id": "uuid",
  "title": "未命名会话",
  "description": null,
  "status": "active",
  "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
  "catalogVersion": "v0.9",
  "rendererVersion": "vue3-v0.9",
  "modelProvider": "openai-compatible",
  "modelName": "gpt-4.1",
  "currentSnapshotId": "uuid",
  "lastAgentRunId": "uuid",
  "createdAt": "2026-07-05T13:43:49.000Z",
  "updatedAt": "2026-07-05T13:43:49.000Z"
}
```

### 3.2 Message

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "agentRunId": "uuid",
  "role": "assistant",
  "kind": "chat",
  "content": "已生成页面。",
  "attachments": [],
  "a2uiEventIds": ["uuid"],
  "metadata": {},
  "createdAt": "2026-07-05T13:43:49.000Z"
}
```

### 3.3 UploadedFile

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "originalName": "需求.txt",
  "mimeType": "text/plain",
  "extension": ".txt",
  "sizeBytes": 1024,
  "encoding": "utf-8",
  "status": "ready",
  "createdAt": "2026-07-05T13:43:49.000Z"
}
```

默认列表不返回 `content`，详情接口可按需返回。

### 3.4 Skill

```json
{
  "id": "uuid",
  "name": "电商后台 UI 规范",
  "description": "用于生成商品、订单、库存相关后台页面。",
  "content": "# Skill...",
  "sourceType": "manual",
  "version": 1,
  "isActive": true,
  "createdAt": "2026-07-05T13:43:49.000Z",
  "updatedAt": "2026-07-05T13:43:49.000Z"
}
```

### 3.5 AgentRun

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "triggerMessageId": "uuid",
  "status": "committed",
  "intent": "CREATE_UI",
  "modelProvider": "openai-compatible",
  "modelName": "gpt-4.1",
  "attemptCount": 1,
  "maxAttempts": 3,
  "inputSnapshotId": null,
  "outputSnapshotId": "uuid",
  "assistantMessageId": "uuid",
  "failureReason": null,
  "validationSummary": {
    "valid": true,
    "attempts": 1,
    "lastErrors": [],
    "lastWarnings": []
  },
  "tokenUsage": {},
  "startedAt": "2026-07-05T13:43:49.000Z",
  "completedAt": "2026-07-05T13:43:55.000Z",
  "createdAt": "2026-07-05T13:43:49.000Z"
}
```

### 3.6 A2UIEvent

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "agentRunId": "uuid",
  "messageId": "uuid",
  "sequence": 1,
  "status": "committed",
  "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
  "catalogVersion": "v0.9",
  "rendererVersion": "vue3-v0.9",
  "surfaceIds": ["main"],
  "messages": [],
  "validationResult": {
    "valid": true,
    "errors": [],
    "warnings": []
  },
  "createdAt": "2026-07-05T13:43:49.000Z"
}
```

### 3.7 SurfaceSnapshot

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "a2uiEventId": "uuid",
  "agentRunId": "uuid",
  "sequence": 1,
  "isCurrent": true,
  "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
  "catalogVersion": "v0.9",
  "rendererVersion": "vue3-v0.9",
  "surfaceCount": 1,
  "componentCount": 8,
  "snapshot": {},
  "summary": "当前页面包含一个客户信息表单。",
  "createdAt": "2026-07-05T13:43:49.000Z"
}
```

## 4. 会话 API

### 4.1 创建会话

```http
POST /api/sessions
```

请求：

```json
{
  "title": "客户管理页面",
  "description": "用于设计客户资料录入 UI",
  "modelName": "gpt-4.1"
}
```

响应 `201`：

```json
{
  "session": {}
}
```

说明：

- `catalogId`、`catalogVersion` 和 `rendererVersion` 由后端默认填充。
- `modelName` 可省略，省略时使用 Runtime 默认配置。

### 4.2 获取会话列表

```http
GET /api/sessions?status=active&limit=50&cursor=
```

响应 `200`：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### 4.3 获取会话详情

```http
GET /api/sessions/:sessionId
```

响应 `200`：

```json
{
  "session": {},
  "currentSnapshot": null,
  "enabledSkillIds": []
}
```

### 4.4 更新会话

```http
PATCH /api/sessions/:sessionId
```

请求：

```json
{
  "title": "新的标题",
  "description": "新的说明",
  "status": "archived"
}
```

响应 `200`：

```json
{
  "session": {}
}
```

## 5. 消息与 Agent API

### 5.1 获取消息列表

```http
GET /api/sessions/:sessionId/messages?limit=100&cursor=
```

响应 `200`：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### 5.2 发送用户消息并触发 Agent

```http
POST /api/sessions/:sessionId/messages
```

请求：

```json
{
  "content": "帮我生成一个客户信息录入表单",
  "attachmentFileIds": ["uuid"],
  "options": {
    "intent": "CREATE_UI"
  }
}
```

响应 `202`：

```json
{
  "message": {
    "id": "uuid",
    "role": "user",
    "content": "帮我生成一个客户信息录入表单"
  },
  "agentRun": {
    "id": "uuid",
    "status": "pending"
  },
  "streamUrl": "/api/sessions/uuid/stream"
}
```

说明：

- 该接口只表示任务已接受。
- Agent 运行过程和结果通过 SSE 推送。
- 如果用户消息只是解释性问题，Agent 可返回 `a2uiMessages: []`，不创建 A2UI event。

### 5.3 获取 Agent run 列表

```http
GET /api/sessions/:sessionId/agent-runs?limit=50&cursor=
```

响应 `200`：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### 5.4 获取 Agent run 详情

```http
GET /api/sessions/:sessionId/agent-runs/:agentRunId
```

响应 `200`：

```json
{
  "agentRun": {},
  "toolCalls": [],
  "assistantMessage": null,
  "a2uiEvents": []
}
```

## 6. 文件 API

### 6.1 上传 `.txt` 文件

```http
POST /api/sessions/:sessionId/files
Content-Type: multipart/form-data
```

表单字段：

```text
file: 需求.txt
```

响应 `201`：

```json
{
  "file": {}
}
```

约束：

- 仅支持 `.txt`。
- 超过大小限制返回 `413`。
- 读取失败返回 `422`。

### 6.2 获取文件列表

```http
GET /api/sessions/:sessionId/files
```

响应 `200`：

```json
{
  "items": []
}
```

### 6.3 获取文件详情

```http
GET /api/sessions/:sessionId/files/:fileId?includeContent=true
```

响应 `200`：

```json
{
  "file": {
    "id": "uuid",
    "originalName": "需求.txt",
    "content": "文件内容..."
  }
}
```

### 6.4 删除文件

```http
DELETE /api/sessions/:sessionId/files/:fileId
```

响应 `204`。

## 7. Skills API

### 7.1 创建 skill

```http
POST /api/skills
```

请求：

```json
{
  "name": "电商后台 UI 规范",
  "description": "用于生成商品、订单、库存相关后台页面。",
  "content": "# Skill\n..."
}
```

响应 `201`：

```json
{
  "skill": {}
}
```

### 7.2 获取 skill 列表

```http
GET /api/skills?active=true&limit=50&cursor=
```

响应 `200`：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### 7.3 更新 skill

```http
PATCH /api/skills/:skillId
```

请求：

```json
{
  "name": "新的名称",
  "description": "新的说明",
  "content": "新的内容",
  "isActive": true
}
```

响应 `200`：

```json
{
  "skill": {}
}
```

### 7.4 启用会话 skill

```http
POST /api/sessions/:sessionId/skills/:skillId/enable
```

响应 `200`：

```json
{
  "sessionSkill": {
    "sessionId": "uuid",
    "skillId": "uuid",
    "enabled": true
  }
}
```

### 7.5 禁用会话 skill

```http
POST /api/sessions/:sessionId/skills/:skillId/disable
```

响应 `200`：

```json
{
  "sessionSkill": {
    "sessionId": "uuid",
    "skillId": "uuid",
    "enabled": false
  }
}
```

## 8. A2UI API

### 8.1 获取 A2UI events

```http
GET /api/sessions/:sessionId/a2ui-events?fromSequence=1&limit=100
```

响应 `200`：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

用途：

- 历史回放。
- Renderer 初始化后补齐事件。
- 导出前检查。

### 8.2 获取 surface snapshots

```http
GET /api/sessions/:sessionId/surface-snapshots?limit=50&cursor=
```

响应 `200`：

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

### 8.3 获取当前 snapshot

```http
GET /api/sessions/:sessionId/surface-snapshots/current
```

响应 `200`：

```json
{
  "snapshot": {}
}
```

如果当前没有 snapshot：

```json
{
  "snapshot": null
}
```

## 9. Renderer 回传 API

### 9.1 提交 action

```http
POST /api/sessions/:sessionId/renderer/action
```

请求：

```json
{
  "version": "v0.9",
  "action": {
    "name": "confirm",
    "surfaceId": "main",
    "sourceComponentId": "submit-btn",
    "timestamp": "2026-07-05T13:43:49.000Z",
    "context": {
      "form": {
        "name": "Alice"
      }
    }
  }
}
```

响应 `202`：

```json
{
  "rendererEvent": {
    "id": "uuid",
    "eventType": "action",
    "handled": false
  }
}
```

MVP 行为：

- 后端记录 action。
- 默认不触发新的 Agent run。
- 后续版本可以通过 action 配置触发 Agent 或业务工具。

### 9.2 提交 error

```http
POST /api/sessions/:sessionId/renderer/error
```

请求：

```json
{
  "version": "v0.9",
  "error": {
    "code": "VALIDATION_FAILED",
    "surfaceId": "main",
    "path": "/components/0/text",
    "message": "Expected string, got number"
  }
}
```

响应 `202`：

```json
{
  "rendererEvent": {
    "id": "uuid",
    "eventType": "error",
    "handled": false
  }
}
```

## 10. SSE API

### 10.1 建立连接

```http
GET /api/sessions/:sessionId/stream
Accept: text/event-stream
```

响应头：

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 10.2 SSE 消息格式

```text
event: a2ui_messages
id: 12
data: {"sessionId":"uuid","event":{}}
```

`id` 建议使用会话级递增 stream sequence。客户端断线重连时可使用 `Last-Event-ID`。

### 10.3 heartbeat

```text
event: heartbeat
data: {"time":"2026-07-05T13:43:49.000Z"}
```

建议每 15 到 30 秒发送一次。

### 10.4 agent_run_started

```text
event: agent_run_started
data: {
  "sessionId": "uuid",
  "agentRun": {
    "id": "uuid",
    "status": "running",
    "attemptCount": 0,
    "maxAttempts": 3
  }
}
```

### 10.5 agent_run_attempt

```text
event: agent_run_attempt
data: {
  "sessionId": "uuid",
  "agentRunId": "uuid",
  "attemptIndex": 1,
  "phase": "VALIDATE_DRAFT",
  "toolCall": {
    "id": "uuid",
    "toolName": "validateA2UI",
    "status": "succeeded",
    "output": {
      "valid": false,
      "errors": []
    }
  }
}
```

用途：

- Runtime tab 展示 Agent 进度。
- 对话区显示“正在校验/正在修复”状态。

### 10.6 assistant_message

```text
event: assistant_message
data: {
  "sessionId": "uuid",
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "已生成页面。"
  }
}
```

### 10.7 a2ui_messages

```text
event: a2ui_messages
data: {
  "sessionId": "uuid",
  "a2uiEvent": {
    "id": "uuid",
    "sequence": 1,
    "messages": [
      {
        "version": "v0.9",
        "createSurface": {
          "surfaceId": "main",
          "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
        }
      }
    ]
  }
}
```

前端收到后必须：

1. 将 `messages` 交给 `frontend/renderer`。
2. 在历史/调试面板记录 event。
3. 不再次校验或修复该消息。

### 10.8 surface_snapshot

```text
event: surface_snapshot
data: {
  "sessionId": "uuid",
  "snapshot": {
    "id": "uuid",
    "sequence": 1,
    "isCurrent": true,
    "surfaceCount": 1,
    "componentCount": 8
  }
}
```

### 10.9 agent_run_failed

```text
event: agent_run_failed
data: {
  "sessionId": "uuid",
  "agentRun": {
    "id": "uuid",
    "status": "failed",
    "attemptCount": 3,
    "failureReason": "A2UI 校验失败"
  },
  "message": {
    "id": "uuid",
    "role": "assistant",
    "kind": "validation_error",
    "content": "生成的 A2UI 未能通过校验，请简化需求后重试。"
  }
}
```

## 11. 导入导出 API

### 11.1 导出完整会话

```http
GET /api/sessions/:sessionId/export
```

响应 `200`：

```json
{
  "version": "v0.1",
  "exportedAt": "2026-07-05T13:43:49.000Z",
  "session": {},
  "messages": [],
  "uploadedFiles": [],
  "skills": [],
  "sessionSkills": [],
  "agentRuns": [],
  "toolCalls": [],
  "a2uiEvents": [],
  "surfaceSnapshots": []
}
```

### 11.2 导出 A2UI JSONL

```http
GET /api/sessions/:sessionId/export/a2ui.jsonl
```

响应：

```http
Content-Type: application/x-ndjson
Content-Disposition: attachment; filename="session-a2ui.jsonl"
```

内容：

```jsonl
{"version":"v0.9","createSurface":{"surfaceId":"main","catalogId":"..."}}
{"version":"v0.9","updateComponents":{"surfaceId":"main","components":[]}}
```

### 11.3 导出当前 snapshot

```http
GET /api/sessions/:sessionId/export/snapshot.json
```

响应：

```http
Content-Type: application/json
Content-Disposition: attachment; filename="surface-snapshot.json"
```

内容为当前 `surface_snapshots.snapshot`，并附带导出元信息。

### 11.4 导入 A2UI JSON/JSONL

MVP 可以预留接口，暂不实现：

```http
POST /api/sessions/:sessionId/import/a2ui
```

预期行为：

- 解析 JSON 或 JSONL。
- 调用 `validateA2UI`。
- 通过后写入 `a2ui_events` 和 `surface_snapshots`。

## 12. Runtime 配置 API

### 12.1 获取 Runtime 配置

```http
GET /api/runtime/config
```

响应 `200`：

```json
{
  "modelProvider": "openai-compatible",
  "modelName": "gpt-4.1",
  "baseUrlConfigured": true,
  "apiKeyConfigured": true,
  "temperature": 0.2,
  "maxTokens": 8192,
  "timeoutMs": 60000,
  "maxAttempts": 3,
  "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
  "catalogVersion": "v0.9",
  "rendererVersion": "vue3-v0.9"
}
```

### 12.2 更新 Runtime 配置

```http
PATCH /api/runtime/config
```

请求：

```json
{
  "modelName": "gpt-4.1",
  "temperature": 0.2,
  "maxTokens": 8192,
  "timeoutMs": 60000,
  "maxAttempts": 3
}
```

响应 `200`：

```json
{
  "config": {}
}
```

说明：

- MVP 可先只支持内存或环境变量配置。
- `apiKey` 不应通过普通配置接口明文返回。

## 13. 错误码

### 13.1 通用错误

```text
BAD_REQUEST
NOT_FOUND
CONFLICT
PAYLOAD_TOO_LARGE
UNPROCESSABLE_ENTITY
INTERNAL_ERROR
```

### 13.2 会话错误

```text
SESSION_NOT_FOUND
SESSION_ARCHIVED
```

### 13.3 文件错误

```text
UNSUPPORTED_FILE_TYPE
FILE_TOO_LARGE
FILE_READ_FAILED
```

### 13.4 Agent 错误

```text
AGENT_RUN_FAILED
AGENT_RUN_CANCELLED
MODEL_REQUEST_FAILED
MODEL_OUTPUT_PARSE_FAILED
A2UI_VALIDATION_FAILED
```

### 13.5 Renderer 错误

```text
INVALID_RENDERER_ACTION
INVALID_RENDERER_ERROR
```

## 14. 前端调用顺序

### 14.1 首次进入

1. `GET /api/runtime/config`
2. `GET /api/sessions`
3. 如果没有会话，调用 `POST /api/sessions`
4. `GET /api/sessions/:sessionId`
5. `GET /api/sessions/:sessionId/messages`
6. `GET /api/sessions/:sessionId/a2ui-events`
7. `GET /api/sessions/:sessionId/stream`

### 14.2 发送生成请求

1. 用户输入内容。
2. 如有文件，先 `POST /api/sessions/:sessionId/files`。
3. 调用 `POST /api/sessions/:sessionId/messages`。
4. 监听 SSE：
   - `agent_run_started`
   - `agent_run_attempt`
   - `assistant_message`
   - `a2ui_messages`
   - `surface_snapshot`
   - 或 `agent_run_failed`

### 14.3 Renderer action

1. 用户点击 A2UI Button。
2. Renderer 生成 A2UI `action`。
3. 前端调用 `POST /api/sessions/:sessionId/renderer/action`。
4. MVP 只记录日志；后续可触发 Agent。

## 15. 后续演进

后续 API 可扩展：

- Catalog 导入、选择和版本管理。
- 会话分支和 rollback。
- snapshot diff。
- 多用户登录和权限。
- 外部 HTTP/API 工具配置。
- action 到 Agent run 的自动触发规则。
