# Frontend 模块实现说明 v0.1

## 1. 模块定位

`frontend` 是平台工作台模块，负责产品/设计用户的主要操作界面。它不实现 A2UI 协议渲染核心，不直接调用模型，不执行 A2UI 校验；它通过 HTTP/SSE 与 `backend` 通信，并把已提交的 A2UI 消息交给 `frontend/renderer`。

## 2. 当前权威入口

- `docs/product/prd.md`
- `docs/architecture/system-design.md`
- `docs/contracts/api.md`
- `docs/modules/frontend.md`

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

工作台采用“侧边导航 + 顶部状态栏 + 主工作区”结构：

- 左侧栏：展示平台品牌、新建创作入口、功能导航和当前会话摘要。
- 顶部状态栏：展示当前页面标题、当前会话说明、SSE 连接状态和生成状态。
- 主工作区：根据当前功能展示创作工作台或辅助管理页面。

MVP tab：

- 创作工作台
- 历史记录
- Skills
- 导入导出
- Runtime

默认进入“创作工作台”tab，但当没有当前会话时，应先展示中心化的初始创建页，用户输入需求并提交后才自动创建会话并进入双栏创作工作台。“新建创作”入口只重置到初始创建页，不提前创建空会话。创作工作台采用双栏布局，左侧为需求对话和输入区，右侧为 A2UI Renderer 实时预览区；在窄屏下允许上下堆叠展示。实时预览区除渲染画布外，还展示当前 Surface 的 `component` 与 `dataModel` JSON 结构，二者直接来自 Renderer 使用的同一个 `SurfaceModel`，当用户在页面中修改合法 JSON 时，应实时更新同源模型并刷新渲染结果。历史记录、Skills、导入导出和 Runtime 作为辅助页面保留原有功能入口。

### 历史恢复与 A2UI 调试

点击历史会话时，前端应加载 `GET /api/sessions/:sessionId` 返回的 `currentSnapshot`，并将快照中的每个 surface 转换为标准 A2UI 消息序列后交给 Renderer：先 `createSurface`，再 `updateComponents`，最后 `updateDataModel`。该恢复过程只用于重建预览状态，不改变后端存储，也不新增 A2UI 协议字段。异步加载完成前如果用户已经切换到其他会话，旧会话响应必须被丢弃，避免预览内容串会话。

会话切换应被视为一次完整水合事务：前端为每次选择生成单调递增的会话修订号，并要求详情、列表请求和 SSE Renderer 事件在提交状态前同时匹配会话 ID 与修订号。Renderer 输入必须显式区分快照全量替换和实时消息增量追加；不得通过消息数组长度推断是否发生变化。恢复失败应进入可见错误状态，不能静默显示空预览，也不能回退到未确认完整性的历史事件拼接结果。

历史记录中的 A2UI 调试页保留底层事件信息，但默认以调试记录形式展示：序号、提交状态、关联 surface、消息数量、Agent Run、创建时间，并支持展开查看 `messages` 与 `validationResult` JSON。该页面用于确认后端提交给 Renderer 的消息批次，不作为普通用户理解生成结果的唯一入口。

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
