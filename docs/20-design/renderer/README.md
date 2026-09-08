# Renderer 模块边界

`packages/renderer`

定位：A2UI v0.9 的前端渲染运行层。Renderer 的长期架构锚点是框架无关的 DOM API runtime，而不是绑定到宿主前端框架的组件树。

负责：

- 消费合法 A2UI 消息并维护 surface 状态。
- 渲染 Basic Catalog 组件。
- 维护 data model、动态绑定和受控交互。
- 向宿主派发 action 和 error。
- 提供函数式 mount API，并提供复用该 mount runtime 的 Web Component 包装。

不负责：

- 会话持久化。
- 后端 API 调用。
- Agent 修复逻辑。
- 工作台业务状态。

边界：

- 输入来自 `packages/frontend` 宿主。
- 协议和共享类型来自 `packages/shared`。
- 对外只暴露渲染、状态更新和宿主事件边界。
- 宿主前端可以使用 Vue、其他框架或无框架代码；Renderer 负责接管自己的 DOM 子树。
