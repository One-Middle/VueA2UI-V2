# 关键决策

## 1. 使用 Vue 深响应式作为主刷新机制

决策：`DataModel` 内部状态使用 Vue `reactive`，不引入额外事件总线或手写刷新版本号作为主机制。

原因：

- Renderer 已经运行在 Vue 体系内，使用 Vue 响应式更贴近现有组件实现。
- Basic 组件本来就在 `computed` 中读取 dataModel，深响应式可以自然触发重新计算。
- 额外版本号会扩大组件依赖面，适合作为未来兜底能力，不适合作为本次主路径。

## 2. 保留 `DataModel.subscribe()`

决策：不删除 `subscribe()`，并修复根替换时对所有路径订阅者的通知。

原因：

- `subscribe()` 仍适合调试面板、精确监听、未来变更上报等扩展场景。
- 根替换会影响所有路径，通知所有订阅者更符合 dataModel 语义。

## 3. `basePath` 作为 Renderer 内部能力

决策：`basePath` 只作为 Renderer 内部渲染上下文能力，不进入 A2UI v0.9 wire schema。

原因：

- A2UI 消息仍只表达组件和 dataModel 数据。
- 相对路径解析属于 Renderer 如何渲染模板组件的内部实现。
- 避免引入新的跨模块契约和上游校验变更。

## 4. 动态 `List` 按数组索引建立 item 作用域

决策：动态 `List` 的第 `index` 项 basePath 为 `listPath/index`。

原因：

- 符合 JSON Pointer 对数组下标的表达方式。
- 模板组件可直接使用 `{ path: "title" }`、`{ path: "price" }` 等相对路径。
- 当前不引入 item key、虚拟列表或复杂 diff 策略。
