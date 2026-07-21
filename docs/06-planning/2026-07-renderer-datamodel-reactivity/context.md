# Renderer dataModel 响应式优化背景

## 1. 问题背景

Renderer 接收 `updateDataModel` 后，会将数据写入 `SurfaceModel.dataModel`，组件再通过 `{ path }` 动态引用读取 dataModel。优化前存在两个核心缺口：

- `DataModel` 使用浅响应式容器，根节点替换可以触发刷新，但深层路径更新不稳定。
- 动态 `List` 能按数组长度重复渲染模板组件，但没有为每个 item 建立独立 dataModel 作用域，模板内无法自然读取当前项字段。

这些问题会影响基于 `updateDataModel` 的实时 UI 更新、表单写回联动和列表模板渲染。

## 2. 改造目标

- 根数据替换和深层 JSON Pointer 写入都能稳定驱动 Vue 组件刷新。
- `DataContext` 能表达并传递当前 dataModel 作用域。
- 动态 `List` 为每个 item 建立独立作用域，模板组件可以使用相对路径读取当前项字段。
- 保留 `DataModel.subscribe()` 的路径级监听能力，并修复根替换时的订阅通知语义。
- 增加回归测试覆盖模型层和真实 DOM 渲染层。

## 3. 非目标

- 不修改 A2UI v0.9 服务端消息结构。
- 不新增 Basic Catalog 字段。
- 不实现 `sendDataModel` 自动回传。
- 不重构 Renderer 的 action/error 回传链路。

## 4. 影响范围

- `packages/renderer/src/core/`
- `packages/renderer/src/vue/`
- `packages/renderer/src/components/basic/`
- `docs/04-modules/`
- `docs/CHANGELOG.md`
