# Renderer 模块说明

## 1. 当前实现

Renderer 已拆分为四个 workspace package：

- `packages/renderer-core`：A2UI 模型、resolver、`RenderPlan` 与 `SurfaceRuntime`。
- `packages/renderer-dom`：原生 DOM Basic UI、mount API、Web Component 与浏览器事件桥接。
- `packages/renderer-vue`：Vue Basic UI、RenderPlan VNode 映射与 `A2uiRuntimeSurface`。
- `packages/renderer-react`：React RenderPlan 映射、`useRenderPlan` 与 `A2uiRuntimeSurface`。

`renderer-core` 不导入 DOM、Vue 或 React。它维护 `DataModel` 路径订阅、构建完整 RenderPlan 快照，并是 model 写回、action/script 与错误语义的唯一执行位置。

## 2. 运行时链路

```text
A2UI server messages
  -> SurfaceGroupModel / SurfaceModel / DataModel
  -> SurfaceRuntime
  -> RenderPlanSnapshot
  -> DOM | Vue | React Adapter
  -> AdapterEvent -> SurfaceRuntime.dispatch()
```

`SurfaceRuntime` 提供 `getSnapshot()`、`subscribe()`、`dispatch()`、`update()`、`setSurfaceId()` 和 `dispose()`。它根据 resolver 收集到的 JSON Pointer 依赖订阅 DataModel，并合并同一微任务内的更新后发布完整快照。

## 3. Adapter 职责

- DOM Adapter 使用 `renderDomNode` 和 DOM registry 生成节点。`DomSurfaceHost` 仅订阅 Runtime、执行 `replaceChildren`、清理 listener 和恢复焦点。函数式 mount API 与 `<a2ui-surface>` 均可接收 Runtime，或基于 `surfaceGroup + surfaceId` 创建自有 Runtime。
- Vue Adapter 的 `A2uiRuntimeSurface` 用 Vue 订阅桥接 Runtime 快照，`renderVueNode` 将 RenderPlan 映射到 Vue Basic UI；Vue 组件事件回传 `runtime.dispatch()`。
- React Adapter 的 `useRenderPlan` 基于 `useSyncExternalStore` 订阅 Runtime，`A2uiRuntimeSurface` 与 React registry 消费同一份 RenderPlan。

Core 的 `ComponentStateStore` 使用 `surfaceId::componentId::basePath` 标识局部状态。DOM、Vue、React 都通过 Runtime 访问该状态，不向 dataModel 写入纯交互状态。

## 4. 宿主事件

Runtime 通过 `onAction`、`onError` 回调提供框架无关的宿主边界。DOM Adapter 将相同 payload 可选映射为冒泡 `a2ui:action`、`a2ui:error` CustomEvent；Vue Frontend 当前直接使用 Runtime 回调记录事件。

## 5. 验证入口

```text
pnpm --filter @a2ui-platform/renderer-core typecheck
pnpm --filter @a2ui-platform/renderer-core test
pnpm --filter @a2ui-platform/renderer-dom typecheck
pnpm --filter @a2ui-platform/renderer-dom test
pnpm --filter @a2ui-platform/renderer-dom demo:build
pnpm --filter @a2ui-platform/renderer-vue typecheck
pnpm --filter @a2ui-platform/renderer-vue test
pnpm --filter @a2ui-platform/renderer-react typecheck
pnpm --filter @a2ui-platform/renderer-react test
pnpm --filter @a2ui-platform/frontend typecheck
pnpm --filter @a2ui-platform/frontend test
```

正式 Basic Catalog 仍为 20 个组件；字段支持范围见 [能力矩阵](./basic-catalog-capabilities.md)。
