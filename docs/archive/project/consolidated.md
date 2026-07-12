# 旧文档合并稿

本文档按主题合并旧资料，去掉重复的模块描述、任务清单和实施说明。它是历史资料索引，不替代当前权威文档。

## 1. 项目边界与工程结构

旧文档一致描述本项目为全栈 Agent 无代码 A2UI 创作平台，核心链路是：

1. 用户通过前端会话输入 UI 需求或上传 `.txt` 文件。
2. Backend 保存会话、消息、文件、Skill、Agent Run 与 A2UI 事件。
3. Agent Runtime 生成 A2UI v0.9 server-to-client 消息。
4. Backend 仅提交通过 `validateA2UI` 校验的消息。
5. Frontend 接收 SSE 并驱动 Renderer 预览。
6. Renderer 渲染 Basic Catalog 组件，并通过宿主前端回传 action/error。

当前工程结构以 `packages/shared`、`packages/renderer`、`packages/frontend`、`packages/backend`、`packages/agent` 五个包为主。旧文档中关于更细粒度子目录的说明仅保留作历史参考，当前文件职责以 `docs/modules/` 为准。过时的开发启动说明、旧任务清单和阶段实施计划已移除，不再归档。

## 2. 产品、API、DB 与实施计划

旧产品文档的有效共识：

- MVP 聚焦单用户或本地开发体验，不引入复杂租户、权限和插件沙箱。
- Skill 是文本规则，不提供任意代码执行能力。
- A2UI 事件、surface snapshot、Agent Run、tool calls、Renderer events 都需要可追踪。
- API 按 Runtime、Sessions、Messages、Files、Skills、A2UI、Renderer 回传、Export 和 SSE 分组。
- DB 以 sessions、messages、files、skills、session_skills、agent_runs、tool_calls、a2ui_events、surface_snapshots、renderer_events 为核心。

去重处理：

- `product/prd.md`、`product/design.md` 中重复的模块定位合并到本文。
- 详细 API 和 DB 字段不在归档中继续维护，当前以 `docs/contracts/api.md` 和 `docs/contracts/db-schema.md` 为准。
- 旧任务清单和过时阶段计划不再作为当前任务来源，已从归档中移除；当前任务只维护在 `docs/tasks/current.md`。

## 3. Shared 类型与跨模块契约

旧文档强调共享类型先行、跨模块契约集中维护，这一点继续保留：

- A2UI 消息、Agent 输入输出、SSE 事件、API DTO 应优先定义在 `packages/shared`。
- Renderer 不依赖 Backend。
- Backend 不把未校验 A2UI 草稿写入正式事件。
- Agent 不直接访问数据库、不读取任意本地路径、不开放 HTTP API。

当前权威说明见 `docs/contracts/shared-types.md` 和 `docs/modules/shared.md`。

## 4. Agent Runtime

旧文档的稳定共识：

- Agent Runtime 输入由 Backend 组装，包括用户输入、历史消息、上传文件、启用 Skill、当前 snapshot、Catalog 信息和模型配置。
- Agent 输出必须是 `{ assistantMessage, a2uiMessages }`。
- 输出必须经过 `validateA2UI` 校验，不通过时进入修复循环。
- tool call 应记录校验、披露和运行过程，便于前端展示与历史回放。

已更新的当前口径：

- Skill 不再作为完整 Markdown 一次性注入初始 Prompt。
- 当前实现采用 Skill 渐进式披露：初始 Prompt 只暴露 `id`、`name`、`description` 摘要；模型通过 `skillInfoRequest` 请求后，Runtime 从本次 `AgentRunInput.enabledSkills` 中精确匹配并披露完整 `content`。
- Skill 内容披露只读取后端传入的启用 Skill 列表，不访问数据库、不读取本地文件、不执行脚本。
- 组件详情披露和 Skill 内容披露已合并为统一的渐进式披露流程。

当前权威说明见 `docs/modules/agent.md`。

## 5. Renderer 与 A2UI

旧 Renderer 文档的有效共识：

- Renderer 只消费已通过后端校验的 A2UI 消息作为正式状态。
- Renderer 内部维护 surface、component 和 data model，不把内部状态放入 Pinia。
- 组件树使用邻接表，容器通过 `child` 或 `children` 引用组件 ID。
- Basic Catalog 组件是 Renderer 的固定渲染边界。
- Renderer 派发 action/error 给宿主前端，不直接调用 Backend。

已确认的契约整理方向：

- `Button.action` 应按官网式结构整理为 `action.event`，不采用旧实现中的扁平 `{ name, context }` 作为新文档口径。
- `action.functionCall` 进入 A2UI 契约作为未来能力，但当前不执行。
- 当前实现与目标契约之间的差异记录在 [conflicts.md](./conflicts.md)，后续需要单独代码迁移。

## 6. 端到端集成链路

旧集成文档可合并为三条主链路：

1. 生成链路：Frontend 发起需求，Backend 创建 Agent Run，Agent 生成并校验 A2UI，Backend 提交事件，Frontend 通过 SSE 更新预览。
2. 修复链路：校验失败后 Runtime 携带错误和已披露上下文进入修复 Prompt。
3. Renderer 回传链路：Renderer 派发 action/error，Frontend 转发给 Backend 记录。

当前端到端权威说明见 `docs/modules/integration.md`。
