# Renderer 模块边界

Renderer 由四个独立 package 组成：

- `packages/renderer-core`
- `packages/renderer-dom`
- `packages/renderer-vue`
- `packages/renderer-react`

定位：A2UI v0.9 的框架无关渲染运行时与平台适配层。核心解析、状态、响应式和交互语义不依赖 DOM、Vue 或 React；各 Adapter 只负责将同一份渲染计划映射到目标 UI 平台。

## 模块功能

Renderer 将已经校验的 A2UI 消息维护为 surface 状态，并将其编译为不可变、纯数据的 `RenderPlan`。`SurfaceRuntime` 订阅显式数据依赖、处理交互事件与组件本地状态，并向 Adapter 发布最新快照。DOM、Vue 和 React Adapter 消费相同的快照并完成各自的视图更新。

它只负责渲染运行时，不理解会话、workflow 或 Agent 的业务含义。

负责：

- 消费合法 A2UI 消息并维护 surface 状态。
- 解析 Basic Catalog、动态值、受控模型、动作、脚本和 slots。
- 以显式 JSON Pointer 依赖维护 dataModel 响应式。
- 生成框架无关的 `RenderPlan`。
- 提供 `SurfaceRuntime` 的快照订阅、交互分发与生命周期契约。
- 为 DOM、Vue、React 分别提供 Basic Catalog 组件映射与挂载能力。
- 向宿主报告 action 与 error；DOM Adapter 可额外派发浏览器 `CustomEvent`。

不负责：

- 会话持久化。
- 后端 API 调用。
- Agent 修复逻辑。
- 工作台业务状态。
- 在 Core 中创建 DOM、VNode 或 React Element。

## 架构与边界

```text
已校验 A2UI Schema / Catalog
  -> Parser + RenderPlan Builder
  -> SurfaceRuntime
  -> DOM Adapter | Vue Adapter | React Adapter
  -> 目标平台视图
```

`renderer-core`：

- 依赖 `packages/shared`、TypeScript、Acorn/SES；不得依赖浏览器 API、Vue 或 React。
- 提供 `SurfaceGroupModel`、`SurfaceModel`、`DataModel`、`RenderPlan`、`SurfaceRuntime` 与协议级错误/action 语义。
- `DataModel` 使用普通 JSON 数据和显式路径订阅，不使用框架响应式或 Proxy 自动依赖追踪。

`renderer-dom`：

- 依赖 `renderer-core` 与原生 DOM API。
- 将 `RenderPlan` 映射为 `HTMLElement`；负责 DOM 事件、焦点恢复和 DOM 更新策略。
- 提供函数式 mount API 与 Web Component 包装；浏览器 action/error 可以作为冒泡的 `CustomEvent` 对外暴露。

`renderer-vue`：

- 依赖 `renderer-core` 与 Vue，提供 Vue Basic Catalog 映射和 runtime 订阅桥接。
- Vue 只负责消费 Runtime 快照并以 Vue 的视图更新机制渲染，不解释 A2UI 协议语义。

`renderer-react`：

- 依赖 `renderer-core` 与 React，提供 React Basic Catalog 映射和 runtime 订阅桥接。
- React 只负责消费 Runtime 快照并以 React 的视图更新机制渲染，不解释 A2UI 协议语义。

## 核心契约

| 对象 | 稳定职责 |
| --- | --- |
| `SurfaceGroupModel` | 管理多个 `SurfaceModel`，承接 A2UI 消息对 surface 集合的变更。 |
| `SurfaceModel` | 保存单个 surface 的组件定义与 `DataModel`。 |
| `DataModel` | 以 JSON Pointer 读写数据，并按显式订阅路径通知变化。 |
| `RenderPlan` | 已解析的纯数据渲染树，包含组件类型、props、slots、组件地址与事件意图。 |
| `SurfaceRuntime` | 生成和发布 RenderPlan 快照；处理依赖订阅、批处理、交互分发、组件本地状态与生命周期。 |
| `ComponentStateStore` | 按 surface、组件和数据作用域保存跨视图更新的局部 UI 状态。 |
| `Adapter` | 订阅 Runtime 快照，将 RenderPlan 映射到目标平台，并把用户交互回传给 Runtime。 |
| `BasicComponentRegistry` | 一个 Adapter 内 Basic Catalog 组件类型到目标平台组件实现的映射。 |

### SurfaceRuntime

每个 surface 对应一个 Runtime。它至少提供以下契约：

```ts
interface SurfaceRuntime {
  getSnapshot(): RenderPlanSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(event: AdapterEvent): void;
  dispose(): void;
}
```

- Runtime 对外发布的是完整 RenderPlan 快照；Adapter 可以按目标平台选择其更新方式。
- Runtime 合并同一微任务内的多次失效，并在下一次发布时生成完整 RenderPlan。
- Adapter 不读取或订阅 `DataModel`，也不执行 model 写回、action 或脚本。
- Adapter 通过 `dispatch` 回传 `componentAddress`、事件名和值；Runtime 解释该事件意图并处理 dataModel、action、脚本或错误。

### RenderPlan 与 Adapter

`RenderPlan` 是 Core 与 Adapter 的唯一渲染数据边界：

- 不包含 `HTMLElement`、Vue `VNode`、React Element、闭包或框架响应式对象。
- 已完成 props、动态路径、属性脚本、受控模型、动作和 slots 的解析。
- 使用稳定组件地址标识 `surfaceId`、`componentId` 与 `basePath`，用于事件回传和局部状态寻址。
- 事件以数据化 intent 表示；只有 Runtime 可以解释 intent 的协议语义。

每个 Adapter 都有独立的 `BasicComponentRegistry`。Catalog、RenderPlan、props、slots 与事件语义共享；布局、事件绑定、生命周期和视觉实现由各平台 Adapter 自己承担。

### 事件与宿主边界

- Runtime 通过框架无关的 `onAction`、`onError` 回调报告协议事件。
- DOM Adapter 可将相同 payload 作为冒泡、可组合的 `a2ui:action` 与 `a2ui:error` CustomEvent 派发给浏览器宿主。
- Vue、React Adapter 不依赖 `window` 或 `CustomEvent`；宿主可通过 Runtime 回调接收事件。

## 主要协作链路

```text
已校验 A2UI messages
  -> SurfaceGroupModel / SurfaceModel / DataModel
  -> SurfaceRuntime 构建并发布 RenderPlan
  -> Adapter 渲染目标平台视图
  -> 用户交互 -> AdapterEvent
  -> SurfaceRuntime dispatch
  -> dataModel 更新或 action / error 回调
```
