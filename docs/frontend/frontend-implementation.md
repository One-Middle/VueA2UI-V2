# Frontend 模块实现说明 v0.1

## 1. 模块定位

`frontend` 是平台工作台模块，负责产品/设计用户的主要操作界面。它不实现 A2UI 协议渲染核心，不直接调用模型，不执行 A2UI 校验；它通过 HTTP/SSE 与 `backend` 通信，并把已提交的 A2UI 消息交给 `frontend/renderer`。

## 2. 输入文档

- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`
- `docs/product/agent-platform-module-specs.md`
- `docs/development-start.md`
- `docs/frontend/tasks.md`

## 3. 已确定技术选型

- 包路径：`packages/frontend`
- 框架：Vue 3
- 构建工具：Vite
- 语言：TypeScript
- 路由：Vue Router
- 状态管理：Pinia
- UI 组件库：Naive UI
- 测试：Vitest

实现约束：

- 工作台业务状态使用 Pinia。
- Renderer 内部状态不得放入 Pinia。
- 工作台 UI 优先使用 Naive UI 组件。
- 路由使用 Vue Router 管理主要页面或工作台入口。
- 前端只允许访问 `VITE_` 前缀环境变量。

## 4. 页面结构

工作台采用两区域结构：

- 左侧栏：tab 选择子模块。
- 右侧功能区域：展示当前子模块内容。

MVP tab：

- 对话
- 预览
- 历史
- Skills
- 导入导出
- Runtime

默认进入“对话”tab。对话页建议在右侧功能区域内并排展示聊天区和实时预览区。

## 5. 职责边界

负责：

- 会话列表、创建、切换、更新。
- 消息列表、发送消息、展示 Agent 状态。
- `.txt` 文件上传入口。
- skill 创建、编辑、启用、禁用。
- A2UI events、snapshots、Agent runs、tool calls 展示。
- SSE 连接管理。
- 调用 Renderer 处理 `a2ui_messages`。
- 转发 Renderer action/error。
- 导出会话、A2UI JSONL、snapshot。

不负责：

- 不解析 A2UI 组件树。
- 不维护 Renderer 内部 surface 模型。
- 不校验或修复 A2UI。
- 不直接访问数据库。
- 不直接调用 OpenAI-compatible API。

## 6. 状态管理

建议维护：

- `activeTab`
- `sessions`
- `activeSessionId`
- `messages`
- `uploadedFiles`
- `skills`
- `enabledSkillIds`
- `agentRuns`
- `a2uiEvents`
- `surfaceSnapshots`
- `streamStatus`

Renderer 状态必须与工作台状态分离。工作台只负责把合法 A2UI 消息批次传入 Renderer。

## 7. API 集成

必须遵守 `docs/product/agent-platform-api.md`。

核心调用：

- `GET /api/runtime/config`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `GET /api/sessions/:sessionId/messages`
- `POST /api/sessions/:sessionId/messages`
- `POST /api/sessions/:sessionId/files`
- `GET /api/sessions/:sessionId/stream`
- `POST /api/sessions/:sessionId/renderer/action`
- `POST /api/sessions/:sessionId/renderer/error`

API DTO 类型优先来自 `packages/shared`。前端请求参数在 UI 层做基础校验，后端仍以 Zod 校验为准。

## 8. SSE 处理

必须处理：

- `heartbeat`
- `agent_run_started`
- `agent_run_attempt`
- `assistant_message`
- `a2ui_messages`
- `surface_snapshot`
- `agent_run_failed`

收到 `a2ui_messages` 后：

1. 保存或展示 event 元信息。
2. 调用 Renderer 消息入口。
3. 更新预览状态。

## 9. 验收标准

- 可以创建和切换会话。
- 可以发送消息并看到 Agent run 状态。
- 可以通过 SSE 收到 assistant message。
- 可以通过 SSE 收到 A2UI messages 并触发 Renderer 更新。
- 可以上传 `.txt` 文件。
- 可以创建、启用、禁用 skill。
- 可以查看历史 events 和 snapshots。
- 可以处理 Renderer action/error 回传。
