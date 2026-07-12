# 集成说明

## 1. 功能定位

本文档描述 Frontend、Renderer、Backend、Agent 和 Shared 的端到端联调方式。它不替代各模块实现文档，也不复制 API/DB/A2UI 契约。

## 2. 端到端成功路径

```text
Frontend MessageInput
  -> POST /api/sessions/:sessionId/messages
  -> Backend MessageService
  -> AgentRunService
  -> AgentRuntime
  -> validateA2UI
  -> Backend 提交事务
  -> SSE a2ui_messages / surface_snapshot
  -> Frontend renderer store
  -> Renderer MessageProcessor
  -> A2uiSurface 渲染
```

## 3. 失败路径

```text
模型输出非法
  -> validateA2UI 返回错误
  -> Agent repair prompt
  -> 最多重试 3 次
  -> 仍失败则 AgentRun FAILED
  -> Backend 不写 A2UI event / snapshot
  -> Frontend 展示失败信息
```

## 4. 关键集成点

### Frontend ↔ Backend

- HTTP API 由 `packages/frontend/src/services/api.ts` 调用。
- SSE 由 `packages/frontend/src/services/stream.ts` 管理。
- 会话切换时必须关闭旧 SSE，并用会话修订号过滤迟到响应。

### Backend ↔ Agent

- Backend 注入 Agent 上下文，不允许 Agent 自行读数据库或本地路径。
- Agent 成功结果必须已通过 `validateA2UI`。
- Backend 只提交合法 A2UI messages。

### Frontend ↔ Renderer

- Frontend 只把后端已提交消息交给 Renderer。
- Renderer 内部状态不进入 Pinia。
- 历史恢复使用 current snapshot 重建，不依赖事件数量推断。

### Renderer ↔ Backend

- Renderer action/error 先交给 Frontend。
- Frontend 调用 Renderer 回传 API。
- Backend 只记录事件，不让 Renderer 直接访问数据库。

## 5. 联调入口

- Frontend：[./frontend.md](./frontend.md)
- Renderer：[./renderer.md](./renderer.md)
- Backend：[./backend.md](./backend.md)
- Agent：[./agent.md](./agent.md)
- API：[../contracts/api.md](../contracts/api.md)
- A2UI：[../contracts/a2ui-v0.9.md](../contracts/a2ui-v0.9.md)
- DB：[../contracts/db-schema.md](../contracts/db-schema.md)

## 6. 验收场景

- 首次输入自然语言后生成可渲染 UI。
- 连续修改同一 surface 后预览更新。
- 上传 `.txt` 后进入 Agent 上下文。
- 启用 skill 后进入 Agent 上下文。
- Agent 校验失败后不提交 events。
- Renderer action/error 可被后端记录。
- 导出会话、A2UI JSONL 和当前 snapshot。
