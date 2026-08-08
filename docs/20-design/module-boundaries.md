# 模块边界

本文档只描述模块功能、定位和边界。当前真实代码结构以 `../40-implementation/modules/` 为准；跨模块契约以 `../30-contracts/` 为准。

## `packages/frontend`

定位：平台工作台，承载用户会话、对话、预览、历史、skills、导入导出和 runtime 调试体验。

负责：

- 工作台 UI、路由和前端状态。
- 用户输入、文件上传入口和会话操作入口。
- HTTP API 调用和 SSE 接收。
- Renderer 预览宿主和导入导出入口。

不负责：

- A2UI 协议渲染核心。
- Agent Runtime、模型调用和 A2UI 校验。
- 数据库访问和服务端事务。

边界：

- 通过 HTTP/SSE 与 `packages/backend` 交互。
- 通过 `packages/renderer` 承载 A2UI 预览。
- 通过 `packages/shared` 使用跨模块 DTO 和事件类型。

## `packages/renderer`

定位：A2UI v0.9 的前端渲染运行层。

负责：

- 消费合法 A2UI 消息并维护 surface 状态。
- 渲染 Basic Catalog 组件。
- 维护 data model、动态绑定和受控交互。
- 向宿主派发 action 和 error。

不负责：

- 会话持久化。
- 后端 API 调用。
- Agent 修复逻辑。
- 工作台业务状态。

边界：

- 输入来自 `packages/frontend` 宿主。
- 协议和共享类型来自 `packages/shared`。
- 对外只暴露渲染、状态更新和宿主事件边界。

## `packages/backend`

定位：平台服务端，负责数据持久化、API、SSE、文件上传、Agent run 编排和提交事务。

负责：

- Express API 和 SSE 通道。
- Prisma / PostgreSQL 持久化。
- 会话、消息、events、snapshots 和 Agent runs。
- 文件上传和 skills 数据管理。
- 调用 Agent Runtime 并提交校验通过的 A2UI 结果。

不负责：

- 直接生成 A2UI 草稿。
- 直接调用模型 API。
- 绕过 Agent 或 `validateA2UI` 提交模型输出。
- 前端渲染。

边界：

- 对 `packages/frontend` 提供 API 和 SSE。
- 通过 `packages/agent` 获取 Agent run 结果。
- 通过 `packages/shared` 共享 DTO、事件和 Agent 结果类型。

## `packages/agent`

定位：受控 Agent Runtime，负责把用户上下文转换为可校验的 A2UI 输出。

负责：

- 构建 Agent 上下文和 prompt。
- 调用 OpenAI-compatible API。
- 解析模型输出。
- 调用 `validateA2UI`。
- 执行有限修复循环。

不负责：

- 直接写数据库。
- 直接访问任意本地路径。
- 开放 HTTP API。
- 外部 HTTP/API 工具调用。
- 前端渲染或会话 UI。

边界：

- 由 `packages/backend` 编排调用。
- 使用 `packages/shared` 的 Agent、A2UI 和结果类型。
- 只返回结构化结果，不直接提交持久化状态。

## `packages/shared`

定位：跨模块类型和契约承载层。

负责：

- API DTO。
- SSE event 类型。
- Agent result 类型。
- A2UI message 类型。
- 其他需要跨模块共享的 TypeScript 类型。

不负责：

- 业务流程实现。
- 运行时副作用。
- UI 渲染。
- 数据库访问。

边界：

- 可被 frontend、renderer、backend、agent 依赖。
- 不依赖任何业务模块。
- 类型变化必须同步 `../30-contracts/`。

## Integration

定位：端到端链路边界，不是独立 package。

负责说明：

- 用户输入如何经过 frontend、backend、agent、shared、renderer。
- A2UI events、surface snapshot 和 SSE 如何串联。
- 跨模块协作的验收视角。

不负责：

- 替代任何单模块实现说明。
- 定义 API、DB 或 A2UI 字段细节。
