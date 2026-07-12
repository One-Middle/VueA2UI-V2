# Frontend 模块任务清单 v0.1

## 1. 模块边界

本任务清单只覆盖 `frontend` 工作台，不包含 `frontend/renderer` 的协议模型和组件渲染实现。

## 2. 依赖契约

必须遵守：

- `docs/product/agent-platform-api.md`
- `docs/development-start.md`
- `docs/frontend/frontend-implementation.md`
- `docs/frontend/renderer/renderer-implementation.md`

可并行前置条件：

- 后端 API 可先用 mock service。
- Renderer 可先用 mock `processMessages()` 接口。

## 3. 任务列表

### TASK-FE-001：工作台基础布局

- 目标：实现左侧 tab 导航和右侧功能区域。
- 依赖任务：无。
- 涉及文件区域：`packages/frontend/src/app`、`packages/frontend/src/components`。
- 实现要求：使用 Vue 3 + Vite + Naive UI；包含“对话、预览、历史、Skills、导入导出、Runtime”六个 tab。
- 验收标准：点击 tab 时右侧区域切换内容。
- 测试要求：组件渲染测试或手动验证 tab 状态。
- 不允许做什么：不实现 Renderer 内部逻辑。

### TASK-FE-002：API client 基础封装

- 目标：封装 JSON 请求、错误响应和 multipart 上传。
- 依赖任务：无。
- 涉及文件区域：`packages/frontend/src/services`、`packages/shared`。
- 实现要求：统一处理 `{ error: { code, message, details } }`；DTO 类型优先从 `packages/shared` 引入。
- 验收标准：可被会话、消息、文件、skills service 复用。
- 测试要求：成功响应和错误响应单元测试。
- 不允许做什么：不把 API 路径散落在组件中。

### TASK-FE-003：会话状态与会话列表

- 目标：加载、创建、切换当前会话。
- 依赖任务：TASK-FE-002。
- 涉及文件区域：`packages/frontend/src/features/history`、`packages/frontend/src/stores`。
- 实现要求：使用 Pinia 管理会话状态；调用 `GET /api/sessions`、`POST /api/sessions`、`GET /api/sessions/:sessionId`。
- 验收标准：无会话时可创建；有会话时可切换。
- 测试要求：空列表和正常列表状态。
- 不允许做什么：不新增 API。

### TASK-FE-004：消息列表与发送输入

- 目标：展示当前会话消息，并发送用户消息。
- 依赖任务：TASK-FE-002、TASK-FE-003。
- 涉及文件区域：`packages/frontend/src/features/conversation`。
- 实现要求：使用 Naive UI 输入组件；调用 `GET /messages` 和 `POST /messages`。
- 验收标准：发送后显示用户消息和 agent run pending 状态。
- 测试要求：空输入不能发送；API 失败保留输入。
- 不允许做什么：不直接生成 A2UI。

### TASK-FE-005：SSE 连接管理

- 目标：建立会话级 SSE，并分发事件。
- 依赖任务：TASK-FE-003。
- 涉及文件区域：`packages/frontend/src/services/stream`。
- 实现要求：切换会话时关闭旧连接；支持自动重连。
- 验收标准：能处理 heartbeat、assistant_message、a2ui_messages、agent_run_failed。
- 测试要求：模拟 SSE event。
- 不允许做什么：不在 SSE 层操作 DOM。

### TASK-FE-006：Renderer 预览接入

- 目标：把 `a2ui_messages` 交给 Renderer，并展示预览区。
- 依赖任务：TASK-FE-005、Renderer mock 或真实入口。
- 涉及文件区域：`packages/frontend/src/features/preview`。
- 实现要求：调用 Renderer 的消息处理入口；显示渲染状态。
- 验收标准：收到 A2UI messages 后预览变化。
- 测试要求：mock Renderer 验证调用。
- 不允许做什么：不解析组件字段。

### TASK-FE-007：文件上传

- 目标：上传 `.txt` 文件并关联会话。
- 依赖任务：TASK-FE-002、TASK-FE-003。
- 涉及文件区域：`packages/frontend/src/features/conversation`、`packages/frontend/src/features/import-export`。
- 实现要求：使用 Naive UI Upload 或等价封装；前端检查扩展名；调用 `POST /files`。
- 验收标准：上传成功后文件可作为消息附件。
- 测试要求：非 `.txt` 被拒绝。
- 不允许做什么：不读取任意本地路径。

### TASK-FE-008：Skills 管理

- 目标：创建、编辑、启用、禁用 skill。
- 依赖任务：TASK-FE-002、TASK-FE-003。
- 涉及文件区域：`packages/frontend/src/features/skills`。
- 实现要求：使用 Naive UI 表单/列表组件；调用 Skills API 和 session skill enable/disable API。
- 验收标准：会话启用 skill 状态正确展示。
- 测试要求：创建、编辑、启用、禁用流程。
- 不允许做什么：不执行 skill 内容。

### TASK-FE-009：Runtime 日志面板

- 目标：展示 Agent runs 和 tool calls。
- 依赖任务：TASK-FE-002、TASK-FE-003。
- 涉及文件区域：`packages/frontend/src/features/runtime`。
- 实现要求：展示 attempt、validation result、failure reason。
- 验收标准：Agent run 失败时可查看错误。
- 测试要求：空状态和失败状态。
- 不允许做什么：不修改 Agent 状态。

### TASK-FE-010：导入导出入口

- 目标：提供会话、A2UI JSONL、snapshot 导出入口。
- 依赖任务：TASK-FE-002、TASK-FE-003。
- 涉及文件区域：`packages/frontend/src/features/import-export`。
- 实现要求：调用导出 API 并触发文件下载。
- 验收标准：三个导出入口可用。
- 测试要求：验证 URL 和文件名。
- 不允许做什么：不生成未校验 A2UI。
