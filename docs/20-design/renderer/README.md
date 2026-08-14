# Renderer 模块边界

`packages/renderer`

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
