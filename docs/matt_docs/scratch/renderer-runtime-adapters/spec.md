# Renderer Runtime Adapters

## Goal

将 A2UI Renderer 实现为框架无关的 Runtime，并提供 DOM、Vue、React 三个独立 Adapter package。Core 只发布纯数据 RenderPlan 并处理协议语义；Adapter 只承担目标平台的视图映射与交互桥接。

权威设计：[Renderer 模块边界](../../../20-design/renderer/README.md)。

## Scope

- 建立 `renderer-core`、`renderer-dom`、`renderer-vue`、`renderer-react` 四个 workspace package。
- 从现有 Renderer 提取 `RenderPlan`、`SurfaceRuntime`、`ComponentStateStore` 和框架无关的宿主事件边界。
- 将现有 DOM 实现改造为 DOM Adapter。
- 提供 Vue 与 React Adapter 及其 Basic Catalog 映射。
- 以跨 Adapter 契约测试确保三种实现共享协议语义。

## Out Of Scope

- 修改 A2UI v0.9 消息格式或 Basic Catalog 定义。
- 变更 JSRuntime 的脚本安全语义。
- 在 Core 中引入 DOM、Vue、React 或自动依赖追踪。
- 第一版实现跨 Adapter 的增量 RenderPlan patch 协议。

## Completion Criteria

- 四个 package 的依赖方向符合设计文档，`renderer-core` 不引入平台依赖。
- 每个 surface 有独立 `SurfaceRuntime`，并支持快照读取、订阅、事件分发和释放。
- Runtime 与 Adapter 之间仅交换 RenderPlan 快照和 AdapterEvent。
- DOM、Vue、React 对正式 Basic Catalog 组件具备一致的协议行为。
- 前端预览可通过 Vue Adapter 消费 Runtime；DOM mount API 与 Web Component 仍可用。
- 契约测试覆盖动态绑定、model 写回、action、脚本、列表相对路径、局部状态和错误回调。
