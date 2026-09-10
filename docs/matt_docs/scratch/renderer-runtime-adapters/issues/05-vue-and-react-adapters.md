# 05 — 实现 Vue 与 React Adapter

**What to build:** 提供消费同一 SurfaceRuntime 快照的 Vue 和 React Adapter，以及各自独立的 Basic Catalog 组件 registry。

**Blocked by:** 03 — Runtime 事件与组件本地状态。

**Status:** resolved

- [x] 实现 Vue runtime 订阅桥接与 Vue RenderPlan renderer。
- [x] 实现 React runtime 订阅桥接，并使用 `useSyncExternalStore` 消费快照。
- [x] 为 Vue 和 React 分别实现 20 个正式 Basic Catalog 组件映射。
- [x] 组件通过统一 AdapterEvent 处理 model 更新、action 和局部状态，而不重复协议解析。
- [x] 确保 slots、Tabs、List 相对路径、受控字段和 style props 在两个 Adapter 中遵守同一 RenderPlan 入口。
- [x] 运行 Vue/React 独立渲染、动态快照刷新与交互事件回流测试。
