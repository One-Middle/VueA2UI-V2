# 全栈 Agent 平台模块实现规格 v0.1

## 0. 文档说明

本文档基于以下文档编写：

- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-db-schema.md`
- `docs/product/agent-platform-api.md`

目标是把平台拆成可执行的模块实现规格，供后续编码 Agent 或开发者逐模块实现。本文档不编写代码，不新增未定义 API，不新增未定义数据库字段。

模块范围：

- `frontend`
- `frontend/renderer`
- `backend`
- `agent`

工程共享契约：

- `packages/shared` 已作为 pnpm workspace 包存在，是跨模块类型的唯一来源。
- API DTO、A2UI message、SSE event、Agent result、validation result 等跨模块类型应优先放入 `packages/shared`。
- 各业务模块不得复制定义 Session、Message、A2UIEvent、SurfaceSnapshot、SSEEvent、AgentResult 等共享 DTO。
- 若任务需要新增跨模块字段，应先更新 `packages/shared`，再更新调用方。

## 1. `frontend` 模块

### 1.1 Module Overview

模块名：`frontend`

职责：

- 提供 Vue3 工作台界面。
- 实现左侧栏 tab 子模块导航和右侧功能区域。
- 管理会话、消息、上传文件、skills、历史、导入导出和 runtime 日志的前端交互。
- 通过 HTTP API 与 `backend` 通信。
- 通过 SSE 接收 Agent run 状态、assistant 消息、A2UI event 和 snapshot。
- 将已提交的 A2UI 消息交给 `frontend/renderer` 处理。
- 接收 `frontend/renderer` 派发的 action/error，并转发给 `backend`。

不负责：

- 不解析 A2UI 组件树。
- 不实现 A2UI 数据绑定。
- 不执行 `validateA2UI`。
- 不直接调用模型。
- 不修复非法 A2UI。

依赖：

- `frontend/renderer`
- `backend` HTTP API
- `backend` SSE stream

### 1.2 Business Logic Definition

核心行为：

- 用户打开平台后，前端加载 runtime 配置和会话列表。
- 若没有会话，用户可创建新会话。
- 用户在“对话”tab 输入需求并发送。
- 前端调用消息 API，后端创建用户消息和 Agent run。
- 前端监听 SSE，展示 Agent run 进度。
- 收到 `assistant_message` 后更新消息列表。
- 收到 `a2ui_messages` 后交给 Renderer 渲染。
- 收到 `surface_snapshot` 后更新当前 snapshot 元信息。
- 用户可上传 `.txt` 文件并将其作为消息附件使用。
- 用户可创建 skill，并在会话中启用或禁用。
- 用户可查看历史 A2UI events、snapshots、Agent runs 和 tool calls。
- 用户可导出会话、A2UI JSONL 和当前 snapshot。

用户流程：

1. 用户进入工作台。
2. 前端调用 `GET /api/runtime/config`。
3. 前端调用 `GET /api/sessions`。
4. 用户选择或创建会话。
5. 前端加载会话详情、消息、A2UI events，并建立 SSE。
6. 用户输入需求。
7. 前端调用 `POST /api/sessions/:sessionId/messages`。
8. 前端展示 Agent run 运行状态。
9. SSE 返回合法 A2UI 消息。
10. 前端交给 Renderer 渲染。

状态：

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

NEEDS CLARIFICATION：

- 具体前端状态管理库未指定。
- 具体 UI 组件库未指定。
- 运行时配置是否允许前端修改 `baseUrl` 和 `apiKey` 未明确。

### 1.3 Data Model Mapping

使用的数据表通过 API 间接访问：

- `sessions`
- `messages`
- `uploaded_files`
- `skills`
- `session_skills`
- `agent_runs`
- `tool_calls`
- `a2ui_events`
- `surface_snapshots`
- `renderer_events`

前端不得直接访问数据库。

字段映射：

- 会话列表使用 `sessions.id`、`title`、`status`、`updated_at`、`catalog_id`、`model_name`。
- 消息列表使用 `messages.role`、`kind`、`content`、`attachments`、`a2ui_event_ids`。
- 文件列表使用 `uploaded_files.original_name`、`size_bytes`、`status`。
- skill 列表使用 `skills.name`、`description`、`content`、`is_active`。
- Runtime 日志使用 `agent_runs.status`、`attempt_count`、`validation_summary` 和 `tool_calls.output`。

约束：

- 前端只展示通过 API 返回的数据。
- 前端不能构造未校验 A2UI event 并直接写入 Renderer 的正式状态。

### 1.4 API Mapping

使用 API：

- `GET /api/runtime/config`
- `PATCH /api/runtime/config`
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId`
- `GET /api/sessions/:sessionId/messages`
- `POST /api/sessions/:sessionId/messages`
- `GET /api/sessions/:sessionId/agent-runs`
- `GET /api/sessions/:sessionId/agent-runs/:agentRunId`
- `POST /api/sessions/:sessionId/files`
- `GET /api/sessions/:sessionId/files`
- `GET /api/sessions/:sessionId/files/:fileId`
- `DELETE /api/sessions/:sessionId/files/:fileId`
- `POST /api/skills`
- `GET /api/skills`
- `PATCH /api/skills/:skillId`
- `POST /api/sessions/:sessionId/skills/:skillId/enable`
- `POST /api/sessions/:sessionId/skills/:skillId/disable`
- `GET /api/sessions/:sessionId/a2ui-events`
- `GET /api/sessions/:sessionId/surface-snapshots`
- `GET /api/sessions/:sessionId/surface-snapshots/current`
- `GET /api/sessions/:sessionId/stream`
- `POST /api/sessions/:sessionId/renderer/action`
- `POST /api/sessions/:sessionId/renderer/error`
- `GET /api/sessions/:sessionId/export`
- `GET /api/sessions/:sessionId/export/a2ui.jsonl`
- `GET /api/sessions/:sessionId/export/snapshot.json`

错误处理：

- `SESSION_NOT_FOUND`：展示会话不存在，并回到会话列表。
- `SESSION_ARCHIVED`：禁用发送消息和上传文件。
- `UNSUPPORTED_FILE_TYPE`：提示仅支持 `.txt`。
- `FILE_TOO_LARGE`：提示文件过大。
- `AGENT_RUN_FAILED` / `A2UI_VALIDATION_FAILED`：在对话和 Runtime tab 中展示失败原因。
- 网络失败：保留本地输入，不清空输入框，提示重试。

### 1.5 Frontend Responsibilities

UI 子模块：

- 对话：消息列表、输入框、发送按钮、上传入口、实时预览区域。
- 预览：Renderer 结果、surface 状态、最近 action/error。
- 历史：sessions、messages、A2UI events、snapshots。
- Skills：skill 列表、创建/编辑、启用/禁用。
- 导入导出：文件上传、会话导出、A2UI JSONL 导出、snapshot 导出。
- Runtime：runtime config、Agent runs、tool calls、校验错误。

状态管理：

- Renderer 状态与工作台状态分离。
- 工作台通过 `processMessages()` 或等价接口向 Renderer 传递消息。
- SSE 连接应跟随 `activeSessionId` 切换而关闭旧连接、建立新连接。

API 集成：

- 所有写操作应展示 loading 状态。
- 所有 API 错误使用统一错误提示。
- 文件上传必须在前端先检查扩展名。

### 1.6 Backend Responsibilities

Not applicable。`frontend` 不实现后端服务，但需要严格遵守 API 文档。

### 1.7 Execution Flow

首次进入：

1. 用户打开应用。
2. 前端调用 `GET /api/runtime/config`。
3. 前端调用 `GET /api/sessions`。
4. 若无会话，用户点击创建，前端调用 `POST /api/sessions`。
5. 前端调用 `GET /api/sessions/:sessionId`。
6. 前端加载 messages、A2UI events 和当前 snapshot。
7. 前端建立 `GET /api/sessions/:sessionId/stream`。
8. 前端把历史 A2UI events 交给 Renderer 回放。

发送消息：

1. 用户输入需求。
2. 前端校验内容非空。
3. 如有附件，确认附件已上传成功。
4. 前端调用 `POST /api/sessions/:sessionId/messages`。
5. 前端追加用户消息或根据响应更新用户消息。
6. SSE 返回 `agent_run_started`，前端展示运行状态。
7. SSE 返回 `agent_run_attempt`，前端更新 Runtime 日志。
8. SSE 返回 `assistant_message`，前端追加 assistant 消息。
9. SSE 返回 `a2ui_messages`，前端交给 Renderer。
10. SSE 返回 `surface_snapshot`，前端更新 snapshot 元信息。

Renderer action：

1. 用户点击 Renderer 中的 A2UI 组件。
2. Renderer 派发 action。
3. `frontend` 调用 `POST /api/sessions/:sessionId/renderer/action`。
4. 前端在预览或 Runtime 面板展示 action 记录。

### 1.8 Edge Cases

- 输入为空：前端阻止发送。
- 无活动会话：禁用消息输入，引导创建会话。
- SSE 断开：显示重连状态，自动重连；重连后通过 events API 补齐。
- 文件类型非 `.txt`：前端阻止上传，后端仍需校验。
- Agent run 失败：保留用户消息，展示失败 assistant 消息，不更新 Renderer。
- A2UI events 回放为空：Renderer 显示空状态。
- 会话切换时旧 SSE 未关闭：必须关闭旧连接，避免跨会话事件污染。
- 未授权访问：MVP 无登录，Not applicable。

### 1.9 Testing Plan

前端测试：

- 左侧 tab 切换正确显示子模块。
- 创建会话后自动进入新会话。
- 发送消息后显示 pending/运行状态。
- SSE `a2ui_messages` 到达后调用 Renderer。
- 上传非 `.txt` 文件被拒绝。
- skill 启用/禁用状态正确更新。
- 导出按钮调用正确 API。
- SSE 断开时显示重连状态。

失败测试：

- API 500 时显示错误。
- Agent run failed 时不更新 Renderer。
- 当前会话为空时页面不崩溃。

### 1.10 Task Breakdown for AI Coding

- TASK-FE-1：创建工作台布局
  - Goal：实现左侧 tab 和右侧功能区域。
  - Files/areas likely touched：`src/frontend/app`、`src/frontend/components`
  - Acceptance checks：可切换“对话/预览/历史/Skills/导入导出/Runtime”。
  - Estimated size：`<200 lines change`

- TASK-FE-2：实现会话列表与当前会话状态
  - Goal：调用 sessions API 并维护 `activeSessionId`。
  - Files/areas likely touched：`src/frontend/features/history`、`src/frontend/services`
  - Acceptance checks：可加载、创建、切换会话。
  - Estimated size：`<200 lines change`

- TASK-FE-3：实现对话消息列表与发送
  - Goal：展示消息并调用发送消息 API。
  - Files/areas likely touched：`src/frontend/features/conversation`
  - Acceptance checks：输入文本后创建 user message 和 agent run。
  - Estimated size：`<200 lines change`

- TASK-FE-4：实现 SSE 客户端
  - Goal：建立会话级 SSE 并分发事件。
  - Files/areas likely touched：`src/frontend/services/stream`
  - Acceptance checks：能处理 heartbeat、assistant_message、a2ui_messages、agent_run_failed。
  - Estimated size：`<200 lines change`

- TASK-FE-5：接入 Renderer 预览
  - Goal：将 SSE A2UI 消息交给 `frontend/renderer`。
  - Files/areas likely touched：`src/frontend/features/preview`
  - Acceptance checks：收到 a2ui_messages 后预览更新。
  - Estimated size：`<200 lines change`

- TASK-FE-6：实现文件上传界面
  - Goal：上传 `.txt` 并关联当前会话。
  - Files/areas likely touched：`src/frontend/features/conversation`、`src/frontend/features/import-export`
  - Acceptance checks：非 `.txt` 被拒绝，成功上传后可作为附件发送。
  - Estimated size：`<200 lines change`

- TASK-FE-7：实现 Skills 管理界面
  - Goal：创建、编辑、启用、禁用 skill。
  - Files/areas likely touched：`src/frontend/features/skills`
  - Acceptance checks：skill 列表与会话启用状态正确。
  - Estimated size：`<200 lines change`

- TASK-FE-8：实现 Runtime 日志面板
  - Goal：展示 Agent runs 和 tool calls。
  - Files/areas likely touched：`src/frontend/features/runtime`
  - Acceptance checks：可查看 attempt、validation result、失败原因。
  - Estimated size：`<200 lines change`

## 2. `frontend/renderer` 模块

### 2.1 Module Overview

模块名：`frontend/renderer`

职责：

- 实现 Vue3 A2UI v0.9 Renderer。
- 接收已通过后端校验的 A2UI server-to-client 消息。
- 维护 surface、component 和 data model 状态。
- 渲染固定 Basic Catalog 组件。
- 处理数据绑定、动态 child list、action、error 和 fallback。

不负责：

- 不调用后端 API。
- 不持久化数据。
- 不调用模型。
- 不决定 Agent 修复。
- 不处理工作台 tab 和会话列表。

依赖：

- Vue3。
- 固定 Basic Catalog schema 或等价本地定义。
- `frontend` 提供的 action/error 回调。

### 2.2 Business Logic Definition

核心行为：

- `MessageProcessor` 接收 A2UI 消息批次。
- `createSurface` 创建 surface。
- `updateComponents` 更新组件 map。
- `updateDataModel` 更新 JSON data model。
- `deleteSurface` 删除 surface 并释放监听器。
- `A2uiSurface` 从 `root` 开始渲染。
- 组件通过 `ComponentContext` 构建子组件、读取动态值和派发 action。
- 输入组件通过绑定 path 写回 `DataModel`。

状态转换：

- surface 不存在 → `createSurface` → surface 存在。
- component 不存在 → `updateComponents` → component 存在。
- component 类型变化 → 重建 component model。
- data path 旧值 → `updateDataModel` → 新值并通知订阅者。
- surface 存在 → `deleteSurface` → surface 删除并释放资源。

NEEDS CLARIFICATION：

- 固定 Catalog schema 的具体代码来源未指定。
- Markdown 渲染策略未指定。
- 图标库映射未指定。

### 2.3 Data Model Mapping

Renderer 不直接访问数据库。

它消费：

- `a2ui_events.messages`
- `surface_snapshots.snapshot` 可用于初始化或调试，但正式渲染建议回放 A2UI events。

核心内部模型：

- `SurfaceGroupModel`
- `SurfaceModel`
- `SurfaceComponentsModel`
- `ComponentModel`
- `DataModel`
- `DataContext`
- `ComponentContext`

约束：

- 只处理 A2UI v0.9。
- 不接受 Catalog 外组件作为正常组件。
- unknown component 必须 fallback。

### 2.4 API Mapping

Renderer 不直接调用 API。

由 `frontend` 注入回调：

- `onAction(message)`
- `onError(message)`

回调最终映射到：

- `POST /api/sessions/:sessionId/renderer/action`
- `POST /api/sessions/:sessionId/renderer/error`

NEEDS CLARIFICATION：

- Renderer 对外暴露 API 名称未指定，例如 `processMessages()` 是否作为正式接口，需要实现时确认。

### 2.5 Frontend Responsibilities

组件：

- `A2uiSurface`
- `A2uiComponent`
- Basic Catalog Vue 组件。

状态：

- Renderer 内部独立维护 surface 状态。
- 通过响应式 store 或自定义订阅机制通知 Vue 更新。

集成点：

- `frontend` 传入 A2UI 消息批次。
- `frontend` 传入 action/error handler。
- `frontend` 可以读取当前 renderer 状态用于调试，正式持久化以 backend snapshot 为准。

### 2.6 Backend Responsibilities

Not applicable。Renderer 不实现后端逻辑。

### 2.7 Execution Flow

处理消息：

1. `frontend` 收到 SSE `a2ui_messages`。
2. `frontend` 调用 Renderer 的消息处理入口。
3. `MessageProcessor` 遍历消息。
4. 根据消息类型更新 `SurfaceGroupModel`。
5. Vue 组件订阅的 model 发生变化。
6. `A2uiSurface` 从 `root` 渲染。
7. 子组件通过 `buildChild` 递归渲染。

输入写回：

1. 用户修改 `TextField`。
2. 组件调用注入的 setter。
3. setter 根据绑定 path 写入 `DataModel`。
4. `DataModel` 通知订阅者。
5. 相关组件更新。

action：

1. 用户点击 `Button`。
2. Renderer 解析 action context。
3. Renderer 生成 A2UI client-to-server action 消息。
4. 调用 `onAction` 回调。
5. `frontend` 转发给后端。

### 2.8 Edge Cases

- `createSurface` 重复 surfaceId：应报告 error 或忽略重复创建。具体行为 NEEDS CLARIFICATION。
- `updateComponents` 指向不存在 surface：应报告 error。
- missing child：显示占位 fallback，后续 child 到达后自动更新。
- unknown component：显示 unknown component fallback，并派发 error。
- JSON Pointer 无法解析：动态值为 undefined，必要时派发 error。
- 输入组件没有 path binding：不注入 setter或 setter no-op。
- action context 解析失败：不派发 action，派发 error。
- 组件卸载：必须释放订阅。

### 2.9 Testing Plan

单元测试：

- `DataModel` JSON Pointer 读写。
- 深层路径自动创建。
- path 订阅通知。
- `MessageProcessor` 处理四类 server-to-client 消息。
- component 类型变化重建。
- dynamic child list basePath。

组件测试：

- `Text` 渲染动态 text。
- `Row`/`Column` 渲染 children。
- `TextField` 写回 data model。
- `Button` 派发 action。
- unknown component fallback。

失败测试：

- 缺失 root。
- child 引用不存在。
- action context 解析失败。

### 2.10 Task Breakdown for AI Coding

- TASK-REN-1：实现核心类型与消息入口
  - Goal：定义 A2UI v0.9 消息类型和 `MessageProcessor` 骨架。
  - Files/areas likely touched：`src/frontend/renderer/core/message-processor`
  - Acceptance checks：能识别四类 server-to-client 消息。
  - Estimated size：`<200 lines change`

- TASK-REN-2：实现 DataModel
  - Goal：支持 JSON Pointer 读写、删除和订阅。
  - Files/areas likely touched：`src/frontend/renderer/core/models`
  - Acceptance checks：深层 set/get/delete 和通知测试通过。
  - Estimated size：`<200 lines change`

- TASK-REN-3：实现 Surface 和 Component 模型
  - Goal：管理 surfaces、components 和 component 更新事件。
  - Files/areas likely touched：`src/frontend/renderer/core/models`
  - Acceptance checks：create/update/delete surface 与 component 更新测试通过。
  - Estimated size：`<200 lines change`

- TASK-REN-4：实现 ComponentContext 和 DataContext
  - Goal：支持动态值解析、basePath、setter 和 action。
  - Files/areas likely touched：`src/frontend/renderer/core/data-context`
  - Acceptance checks：path binding、relative path、setter 测试通过。
  - Estimated size：`<200 lines change`

- TASK-REN-5：实现 Vue 渲染入口
  - Goal：实现 `A2uiSurface` 和递归组件渲染。
  - Files/areas likely touched：`src/frontend/renderer/vue`
  - Acceptance checks：能从 root 渲染 Text/Row/Column。
  - Estimated size：`<200 lines change`

- TASK-REN-6：实现最小 Basic Catalog 组件
  - Goal：实现 `Text`、`Row`、`Column`、`Button`、`TextField`。
  - Files/areas likely touched：`src/frontend/renderer/components/basic`
  - Acceptance checks：显示、输入、按钮 action 可用。
  - Estimated size：`<200 lines change`

- TASK-REN-7：实现 fallback 与错误派发
  - Goal：missing child、unknown component、action error 可见并可上报。
  - Files/areas likely touched：`src/frontend/renderer/core`、`src/frontend/renderer/vue`
  - Acceptance checks：异常场景不崩溃且调用 error 回调。
  - Estimated size：`<200 lines change`

- TASK-REN-8：补齐 Basic Catalog 组件
  - Goal：实现 PRD 要求的全部 Basic Catalog 组件。
  - Files/areas likely touched：`src/frontend/renderer/components/basic`
  - Acceptance checks：每个组件有最小渲染和交互测试。
  - Estimated size：`<200 lines change`

## 3. `backend` 模块

### 3.1 Module Overview

模块名：`backend`

职责：

- 提供 HTTP API 和 SSE。
- 管理 PostgreSQL 数据访问。
- 处理 `.txt` 文件上传和读取。
- 管理 sessions、messages、skills、events、snapshots、agent runs、tool calls。
- 调用 `agent` 模块执行生成任务。
- 提交通过校验的 A2UI events 和 surface snapshots。
- 接收 Renderer action/error。

不负责：

- 不直接调用模型。
- 不绕过 `agent` 提交模型输出。
- 不实现 A2UI 前端渲染。
- 不做登录权限。

依赖：

- PostgreSQL。
- `agent`。
- SSE transport。

### 3.2 Business Logic Definition

核心行为：

- 创建和维护单用户会话。
- 接收用户消息后创建 Agent run。
- 调用 `agent`，等待其返回成功或失败结果。
- 成功时事务提交 assistant message、A2UI event、surface snapshot。
- 失败时记录失败 run 和失败消息，不创建 A2UI event。
- 将 run 进度和结果通过 SSE 推送给前端。
- 上传 `.txt` 后保存内容，并可作为 Agent 上下文。
- skill 可创建、更新，并可在会话中启用或禁用。

状态转换：

- session：`active` → `archived` / `deleted`。
- agent_run：`pending` → `running` → `committed` / `failed` / `cancelled`。
- a2ui_event：创建即 `committed`，后续可演进为 `reverted`。
- uploaded_file：`ready` / `failed` / `deleted`。

NEEDS CLARIFICATION：

- Agent run 是否支持用户主动取消，API 文档未定义取消接口。
- Runtime config 是否持久化到数据库，DB schema 未定义 runtime settings 表。

### 3.3 Data Model Mapping

使用表：

- `sessions`
- `messages`
- `uploaded_files`
- `skills`
- `session_skills`
- `agent_runs`
- `tool_calls`
- `a2ui_events`
- `surface_snapshots`
- `renderer_events`

关键约束：

- `a2ui_events.sequence` 在 session 内唯一递增。
- `surface_snapshots.sequence` 在 session 内唯一递增。
- 同一 session 只有一个 `surface_snapshots.is_current = true`。
- `sessions.current_snapshot_id` 指向当前 snapshot。
- `agent_runs.output_snapshot_id` 指向成功提交后的 snapshot。

事务：

- 成功提交 Agent run 必须在一个事务内更新 run、message、event、snapshot、session。
- 失败 Agent run 不创建 event 和 snapshot。

### 3.4 API Mapping

创建或提供以下 API：

- 会话 API：`POST/GET/PATCH /api/sessions...`
- 消息 API：`GET/POST /api/sessions/:sessionId/messages`
- Agent run API：`GET /api/sessions/:sessionId/agent-runs`
- 文件 API：`POST/GET/DELETE /api/sessions/:sessionId/files`
- Skills API：`POST/GET/PATCH /api/skills` 与 enable/disable。
- A2UI API：events、snapshots、current snapshot。
- Renderer API：action/error。
- SSE：`GET /api/sessions/:sessionId/stream`
- 导出 API：session、A2UI JSONL、snapshot。
- Runtime API：`GET/PATCH /api/runtime/config`

错误：

- 资源不存在返回 `404`。
- 文件类型非法返回 `400` 或 `422`，错误码 `UNSUPPORTED_FILE_TYPE`。
- 文件过大返回 `413`。
- 归档会话写入返回 `409 SESSION_ARCHIVED`。
- Agent 失败通过 SSE 事件和 message 返回。

### 3.5 Frontend Responsibilities

Not applicable。`backend` 不实现前端，但需要返回 API 文档约定的数据结构。

### 3.6 Backend Responsibilities

Services：

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

Controllers：

- `SessionController`
- `MessageController`
- `FileController`
- `SkillController`
- `A2UIController`
- `RendererEventController`
- `ExportController`
- `RuntimeController`

Validation：

- UUID 参数校验。
- `.txt` 文件扩展名和大小校验。
- 消息内容非空校验。
- session 状态校验。
- renderer action/error A2UI client-to-server 结构校验。

Error handling：

- 使用统一错误响应 `{ error: { code, message, details } }`。
- 数据库事务失败不得发送已提交 SSE。
- Agent run 成功事务提交后再发送 `a2ui_messages`。

### 3.7 Execution Flow

发送消息并生成 UI：

1. `frontend` 调用 `POST /api/sessions/:sessionId/messages`。
2. Controller 校验 sessionId 和 body。
3. `SessionService` 检查 session 存在且未归档。
4. `MessageService` 创建 user message。
5. `AgentRunService` 创建 pending run。
6. API 返回 `202`。
7. 后端异步启动 Agent run。
8. `StreamService` 推送 `agent_run_started`。
9. `agent` 执行生成、校验、修复。
10. `backend` 接收 agent 成功结果。
11. 后端事务创建 assistant message、a2ui_event、surface_snapshot，并更新 session。
12. 事务提交。
13. `StreamService` 推送 assistant_message、a2ui_messages、surface_snapshot。

上传文件：

1. `frontend` 上传 `.txt`。
2. Controller 校验扩展名和大小。
3. `FileService` 读取 UTF-8 文本。
4. 写入 `uploaded_files`。
5. 返回文件元数据。

Renderer action：

1. `frontend` 转发 action。
2. Controller 校验消息结构。
3. `RendererEventService` 写入 `renderer_events`。
4. 返回 `202`。

### 3.8 Edge Cases

- session 不存在：返回 `SESSION_NOT_FOUND`。
- session archived：写操作返回 `SESSION_ARCHIVED`。
- DB 提交失败：Agent 成功结果不得通过 SSE 推送。
- SSE 连接断开：不影响数据库提交，前端可通过 events API 补齐。
- Agent run 超时：标记 failed，发送 `agent_run_failed`。
- 文件读取失败：写入 failed 文件记录或直接返回 `FILE_READ_FAILED`，具体策略 NEEDS CLARIFICATION。
- 并发发送两条消息：sequence 生成必须在事务内避免冲突。
- 未授权访问：MVP 无登录，Not applicable。

### 3.9 Testing Plan

API 测试：

- 创建/列表/详情/更新 session。
- 发送 message 后创建 agent run。
- 上传 `.txt` 成功。
- 上传非 `.txt` 失败。
- 创建/启用/禁用 skill。
- 获取 A2UI events 和 snapshot。
- Renderer action/error 写入成功。

服务测试：

- 成功 Agent run 事务提交完整数据。
- 失败 Agent run 不创建 event/snapshot。
- sequence 在并发提交时唯一递增。
- current snapshot 唯一。

SSE 测试：

- 推送 heartbeat。
- 推送 agent_run_started。
- 推送 a2ui_messages。
- 推送 agent_run_failed。

### 3.10 Task Breakdown for AI Coding

- TASK-BE-1：建立后端路由和错误响应基础
  - Goal：提供统一 controller、error handler、响应格式。
  - Files/areas likely touched：`src/backend/routes`、`src/backend/controllers`
  - Acceptance checks：错误响应符合 API 文档。
  - Estimated size：`<200 lines change`

- TASK-BE-2：实现数据库 repositories
  - Goal：为核心表提供基础 CRUD。
  - Files/areas likely touched：`src/backend/repositories`
  - Acceptance checks：sessions/messages/agent_runs/events/snapshots 可读写。
  - Estimated size：`<200 lines change`

- TASK-BE-3：实现 Session 和 Message API
  - Goal：创建会话、发送消息、读取消息。
  - Files/areas likely touched：`src/backend/controllers`、`src/backend/services`
  - Acceptance checks：API 文档示例请求可成功。
  - Estimated size：`<200 lines change`

- TASK-BE-4：实现 SSE StreamService
  - Goal：会话级 SSE 连接和事件推送。
  - Files/areas likely touched：`src/backend/stream`
  - Acceptance checks：能发送 heartbeat 和业务事件。
  - Estimated size：`<200 lines change`

- TASK-BE-5：实现 Agent run 编排
  - Goal：发送消息后异步调用 agent 并推送状态。
  - Files/areas likely touched：`src/backend/services/AgentRunService`
  - Acceptance checks：成功/失败 run 状态正确。
  - Estimated size：`<200 lines change`

- TASK-BE-6：实现成功提交事务
  - Goal：提交 assistant message、a2ui_event、snapshot、session 更新。
  - Files/areas likely touched：`src/backend/services/A2UIEventService`、`SurfaceSnapshotService`
  - Acceptance checks：事务完成后 current snapshot 正确。
  - Estimated size：`<200 lines change`

- TASK-BE-7：实现文件 API
  - Goal：上传、列表、详情、删除 `.txt`。
  - Files/areas likely touched：`src/backend/files`
  - Acceptance checks：文件类型和大小校验生效。
  - Estimated size：`<200 lines change`

- TASK-BE-8：实现 Skills API
  - Goal：创建、更新、启用、禁用 skill。
  - Files/areas likely touched：`src/backend/services/SkillService`
  - Acceptance checks：session_skills 状态正确。
  - Estimated size：`<200 lines change`

- TASK-BE-9：实现 Renderer event API
  - Goal：记录 action/error。
  - Files/areas likely touched：`src/backend/services/RendererEventService`
  - Acceptance checks：合法 action/error 入库。
  - Estimated size：`<200 lines change`

- TASK-BE-10：实现导出 API
  - Goal：导出 session、A2UI JSONL 和 snapshot。
  - Files/areas likely touched：`src/backend/export`
  - Acceptance checks：导出内容符合 API 文档。
  - Estimated size：`<200 lines change`

## 4. `agent` 模块

### 4.1 Module Overview

模块名：`agent`

职责：

- 实现受控 Agent Runtime。
- 构建上下文。
- 组织 prompt。
- 调用 OpenAI-compatible API。
- 解析模型 JSON 输出。
- 强制执行 `validateA2UI`。
- 失败时最多修复 3 次。
- 返回结构化成功或失败结果给 `backend`。

不负责：

- 不直接操作前端。
- 不直接开放 HTTP API。
- 不读取任意本地路径。
- 不提供外部 HTTP/API 工具。
- 不绕过 `validateA2UI` 输出 A2UI。

依赖：

- `backend` 提供的 session、message、file、skill、snapshot 数据。
- OpenAI-compatible API。
- 固定 Basic Catalog schema。

### 4.2 Business Logic Definition

核心行为：

- Runtime 状态从 `PREPARE_CONTEXT` 开始。
- 构建用户输入、历史、snapshot、文件、skills、Catalog 摘要。
- 调用模型生成 JSON envelope。
- 解析 `assistantMessage` 和 `a2uiMessages`。
- 如果 `a2uiMessages` 为空，返回仅文字回复。
- 如果非空，调用 `validateA2UI`。
- 校验失败则构建 repair prompt 并重试。
- 超过 3 次仍失败则返回 `FAILED`。
- 校验成功返回 `COMMITTED` 候选结果，由 backend 提交。

状态转换：

- `PREPARE_CONTEXT` → `GENERATE_DRAFT`
- `GENERATE_DRAFT` → `VALIDATE_DRAFT`
- `VALIDATE_DRAFT` valid → `COMMIT`
- `VALIDATE_DRAFT` invalid 且 attempts < 3 → `REPAIR_DRAFT`
- `VALIDATE_DRAFT` invalid 且 attempts >= 3 → `FAILED`

NEEDS CLARIFICATION：

- OpenAI-compatible API 使用 chat/completions 还是 responses 风格未最终指定。
- Catalog schema 文件来源路径未在产品文档中固定。
- 会话摘要生成策略未定义。

### 4.3 Data Model Mapping

`agent` 不直接拥有数据库，但其运行结果映射到：

- `agent_runs.status`
- `agent_runs.attempt_count`
- `agent_runs.validation_summary`
- `agent_runs.token_usage`
- `tool_calls.tool_name = validateA2UI`
- `tool_calls.output`
- 成功时由 backend 创建 `messages`、`a2ui_events`、`surface_snapshots`

输入数据来自：

- `messages`
- `uploaded_files`
- `skills`
- `session_skills`
- `surface_snapshots`
- `sessions.catalog_id`
- `sessions.catalog_version`
- `sessions.model_name`

约束：

- 未通过校验的草稿不得进入 `a2ui_events`。
- `apiKey` 不写入数据库明文字段。

### 4.4 API Mapping

`agent` 不直接提供 HTTP API。

由 `backend` 通过内部调用触发。外部关联 API：

- `POST /api/sessions/:sessionId/messages` 触发 Agent run。
- `GET /api/sessions/:sessionId/agent-runs` 查看结果。
- SSE 事件展示运行进度。

NEEDS CLARIFICATION：

- 内部 `agent.run(input)` 的 TypeScript 接口未在 API 文档定义，需要实现时在模块内定义。

### 4.5 Frontend Responsibilities

Not applicable。`agent` 不实现前端，但通过 backend/SSE 让前端看到状态。

### 4.6 Backend Responsibilities

Backend 需要为 agent 提供：

- 当前 session。
- 触发消息。
- 最近消息。
- 会话摘要，如已存在。
- 当前 surface snapshot。
- 上传文件内容。
- 启用 skills。
- 模型配置。
- 记录 tool call 的回调或 service。
- 发送 SSE 进度的回调或 event bus。

### 4.7 Execution Flow

Agent run：

1. `backend` 创建 `agent_runs`。
2. `backend` 调用 `agent.run(input)`。
3. `AgentRuntime` 进入 `PREPARE_CONTEXT`。
4. `AgentContextBuilder` 组装上下文。
5. `PromptComposer` 生成初始 prompt。
6. `ModelClient` 调用 OpenAI-compatible API。
7. Runtime 解析模型 JSON。
8. 如果 JSON 解析失败，记录 attempt 失败并进入修复或失败。
9. 如果 `a2uiMessages` 为空，返回仅文字 assistant 结果。
10. 如果非空，`ToolExecutor` 调用 `validateA2UI`。
11. 如果校验失败，记录 tool call，构建 repair prompt。
12. 如果 attempts < 3，回到模型调用。
13. 如果校验通过，返回成功结果。
14. `backend` 负责事务提交和 SSE 推送。

### 4.8 Edge Cases

- 模型请求失败：返回 `MODEL_REQUEST_FAILED`，Agent run failed。
- 模型返回非 JSON：作为一次失败 attempt。
- JSON envelope 缺少 `assistantMessage`：失败或修复，具体行为 NEEDS CLARIFICATION。
- `a2uiMessages` 不是数组：失败或修复。
- `validateA2UI` 报错：tool call failed，attempt 失败。
- 连续 3 次校验失败：返回 `FAILED`。
- 当前无 snapshot：CREATE_UI 可以继续；MODIFY_UI 需要降级或失败，具体行为 NEEDS CLARIFICATION。
- skill 内容过长：上下文截断策略 NEEDS CLARIFICATION。
- 未授权访问：MVP 无登录，Not applicable。

### 4.9 Testing Plan

单元测试：

- PromptComposer 输出包含固定 Catalog 限制。
- ModelClient 处理成功响应。
- ModelClient 处理错误响应。
- JSON envelope 解析。
- validateA2UI 成功路径。
- validateA2UI 失败后 repair prompt。
- 3 次失败后返回 FAILED。

集成测试：

- CREATE_UI 成功生成合法 A2UI。
- MODIFY_UI 使用 current snapshot。
- a2uiMessages 为空时只返回 assistantMessage。
- 模型输出 unknown component 时修复。
- 模型输出非法 child 引用时修复。

### 4.10 Task Breakdown for AI Coding

- TASK-AG-1：定义 Agent Runtime 输入输出类型
  - Goal：定义 run input、attempt、result、validation result 类型。
  - Files/areas likely touched：`src/agent/runtime`
  - Acceptance checks：backend 可类型安全调用 agent。
  - Estimated size：`<200 lines change`

- TASK-AG-2：实现 AgentContextBuilder
  - Goal：组装用户输入、消息、snapshot、文件、skills、Catalog 摘要。
  - Files/areas likely touched：`src/agent/context`
  - Acceptance checks：上下文字段完整且不读取任意路径。
  - Estimated size：`<200 lines change`

- TASK-AG-3：实现 PromptComposer
  - Goal：生成初始 prompt 和 repair prompt。
  - Files/areas likely touched：`src/agent/prompts`
  - Acceptance checks：prompt 包含输出契约和禁止 Catalog 外组件规则。
  - Estimated size：`<200 lines change`

- TASK-AG-4：实现 ModelClient
  - Goal：封装 OpenAI-compatible API 非流式调用。
  - Files/areas likely touched：`src/agent/model`
  - Acceptance checks：成功、超时、错误响应可处理。
  - Estimated size：`<200 lines change`

- TASK-AG-5：实现模型输出解析
  - Goal：解析 JSON envelope 并验证基本结构。
  - Files/areas likely touched：`src/agent/runtime`
  - Acceptance checks：非 JSON、缺字段、类型错误均被捕获。
  - Estimated size：`<200 lines change`

- TASK-AG-6：实现 validateA2UI 工具骨架
  - Goal：校验消息结构、Catalog 外组件、root、child 引用。
  - Files/areas likely touched：`src/agent/tools/validate-a2ui`
  - Acceptance checks：已知非法样例返回 errors。
  - Estimated size：`<200 lines change`

- TASK-AG-7：实现 Runtime 状态机
  - Goal：串联生成、校验、修复、失败和成功结果。
  - Files/areas likely touched：`src/agent/runtime`
  - Acceptance checks：最多 3 次 attempt，成功后停止。
  - Estimated size：`<200 lines change`

- TASK-AG-8：实现 tool call 记录回调
  - Goal：Runtime 每次 validateA2UI 调用都通知 backend 记录。
  - Files/areas likely touched：`src/agent/runtime`、`src/backend/services`
  - Acceptance checks：tool_calls 中有 attempt_index 和 output。
  - Estimated size：`<200 lines change`

- TASK-AG-9：实现 Agent 失败结果规范化
  - Goal：统一失败 reason、validation summary 和 assistantMessage。
  - Files/areas likely touched：`src/agent/runtime`
  - Acceptance checks：3 次失败后返回 API 文档定义的失败说明。
  - Estimated size：`<200 lines change`

## 5. 跨模块集成任务

- TASK-INT-1：完善共享类型边界
  - Goal：在已创建的 `packages/shared` 中完善 API DTO、A2UI message 类型、SSE event 类型和 Agent result 类型，避免循环依赖。
  - Files/areas likely touched：`packages/shared/src`
  - Acceptance checks：`packages/frontend`、`packages/renderer`、`packages/backend`、`packages/agent` 可通过 `@a2ui-platform/shared` 复用同一批契约类型。
  - Estimated size：`<200 lines change`

- TASK-INT-2：实现最小端到端生成链路
  - Goal：用户发送消息后，后端返回一批固定 mock A2UI messages，Renderer 可渲染。
  - Files/areas likely touched：`frontend`、`backend`、`frontend/renderer`
  - Acceptance checks：无需真实模型即可验证 UI 链路。
  - Estimated size：`<200 lines change`

- TASK-INT-3：接入真实 Agent Runtime
  - Goal：替换 mock，使用真实模型生成、校验和提交。
  - Files/areas likely touched：`backend`、`agent`
  - Acceptance checks：成功 run 会创建 message、event、snapshot，并通过 SSE 更新前端。
  - Estimated size：`<200 lines change`

- TASK-INT-4：端到端失败链路
  - Goal：模拟 validateA2UI 三次失败。
  - Files/areas likely touched：`backend`、`agent`、`frontend`
  - Acceptance checks：不创建 A2UI event，前端显示失败消息。
  - Estimated size：`<200 lines change`

## 6. 实现优先级

建议优先级：

1. `frontend/renderer` 最小核心：DataModel、SurfaceModel、MessageProcessor、Text/Row/Column。
2. `backend` 基础 API 和数据库读写。
3. `frontend` 工作台和 SSE 接收。
4. `agent` Runtime 与 validateA2UI。
5. 端到端链路。
6. 文件上传和 skills。
7. 导入导出。
8. 补齐 Basic Catalog 组件和调试面板。

关键验收线：

- 用户能创建会话。
- 用户能发送一条需求。
- Agent 成功时产生 assistant message、A2UI event、surface snapshot。
- 前端通过 SSE 收到 A2UI messages。
- Renderer 能渲染合法 UI。
- Agent 失败时不产生 A2UI event。
