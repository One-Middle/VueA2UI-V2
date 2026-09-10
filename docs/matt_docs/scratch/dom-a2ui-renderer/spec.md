# DOM A2UI Renderer

## Goal

将 `packages/renderer` 从 Vue 3 renderer 迁移为纯 DOM API renderer，并最终移除 renderer package 对 Vue、Vue SFC、`vue-tsc` 和 Vite Vue plugin 的依赖。

目标链路：

```text
A2UI server messages
-> SurfaceGroupModel
-> buildRenderTree
-> RenderNode
-> DOM renderer
-> browser DOM
```

保留现有 A2UI 协议语义、RenderNode 中间层、JSRuntime、动态值解析、显式依赖收集和 Basic Catalog 能力；替换 Vue 承担的响应式、VNode 渲染、组件本地状态和 surface 生命周期。

## Problem

当前 `packages/renderer` 已经把 A2UI 语义解析集中到 RenderNode/resolver 层，但运行时仍依赖 Vue：

- `DataModel`、`ComponentModel`、`SurfaceModel` 使用 Vue `reactive`。
- `A2uiSurface.vue` 使用 `computed`、`ref`、`watch` 管理 surface render revision 和 dataModel 订阅。
- `render/vue-renderer.ts` 将 RenderNode 转换为 Vue VNode。
- `src/ui/basic/*.vue` 是普通 Vue Basic UI 组件。
- renderer package 的构建、测试和导出仍包含 Vue SFC 入口。

本次迁移要让 renderer 成为框架无关的 DOM renderer，同时保持对宿主前端的集成友好。

## Core Decisions

### Remove Vue as final state

最终状态是移除 Vue renderer，而不是长期保留 Vue/DOM 双后端。

迁移过程可以短暂新增 DOM path 与现有 Vue path 并存，用测试保护行为；收尾时删除：

- `src/vue/*`
- `src/render/vue-renderer.ts`
- `src/ui/basic/*.vue`
- renderer package 中的 `vue`、`vue-tsc`、`@vitejs/plugin-vue`
- Vue SFC 相关 tsconfig/vite 配置

### Keep RenderNode pipeline

继续保留当前中间层：

```text
ComponentModel -> resolver pipeline -> RenderNode -> renderer backend
```

DOM renderer 不直接解释 A2UI raw component JSON。A2UI 语义仍集中在：

- `build-render-node.ts`
- `resolve-props.ts`
- `resolve-model-bindings.ts`
- `resolve-action-bindings.ts`
- `resolve-slots.ts`
- `resolve-style.ts`
- `resolve-dynamic.ts`

### Explicit dataModel reactivity

第一版 dataModel 响应式采用显式 deps/path 订阅，不做 Proxy 自动依赖追踪。

依赖来源：

- `{ path: "..." }` 动态值。
- property script `deps`。
- model binding 的 `{ path }`。
- List repeated path。

`DataModel.set/delete` 负责通知路径订阅者。根替换通知所有订阅；深层变更通知目标路径和祖先路径。

### Surface full rebuild

第一版不做 DOM diff，也不做 per-node patch。

流程：

```text
dataModel/component change
-> schedule rebuild
-> buildRenderTree
-> sync dataModel subscriptions
-> renderDomNode
-> replace surface contents
```

依赖收集仍是细粒度的，DOM 更新粒度是 surface 级的。保留未来 subtree rebuild 或 keyed patch 的扩展空间。

### Microtask scheduling

默认使用微任务批处理 rebuild：

- dataModel/component/surface 变更调用 `scheduleUpdate()`。
- `scheduleUpdate()` 用 `queueMicrotask` 合并同一 tick 的多次变更。
- `handle.update()` 触发同步 rebuild。
- `handle.unmount()` 同步清理 DOM、订阅、事件和 host 状态引用。

### Focus restoration

由于第一版会整块替换 DOM，DOM host 需要在 rebuild 前后尽量恢复焦点和文本选择区间。

建议记录：

- active element 的 component key。
- input/textarea/select 的 value 或 model path。
- selectionStart/selectionEnd/selectionDirection。

rebuild 后按 component key 和可聚焦选择器恢复。无法恢复时静默跳过。

### Host-level UI state store

组件本地 UI 状态由 `DomSurfaceHost` 维护，不写入 `dataModel`。

状态 key：

```text
surfaceId::componentId::basePath
```

组件状态字段示例：

- `Tabs.activeKey`
- `Modal.visible`，如果未来重新支持 Modal。
- `Image.hasLoadError`
- audio/video transient UI state, if needed.

受控业务数据仍走 `dataModel`，例如 `TextField.modelValue`、`CheckBox.modelValue`、`Slider.modelValue`。

### DOM Basic UI component layer

DOM Basic UI 保持普通组件层，不写成一个巨大 switch。

普通 DOM 组件不感知 A2UI 协议，不 import：

- `ComponentModel`
- `DataContext`
- `SurfaceModel`
- `dynamic-value`
- `action`

建议接口：

```ts
interface DomBasicComponentInput {
  props: Record<string, unknown>;
  slots: DomSlotRendererMap;
  emit: (eventName: string, value?: unknown) => void;
  state: DomComponentState;
  renderChildren: (nodes: RenderNode[]) => Node[];
}

interface DomRenderResult {
  node: Node;
  cleanup?: () => void;
}
```

### Function mount API first

核心公开 API 先实现函数式 mount：

```ts
const handle = mountA2uiSurface(container, {
  surfaceGroup,
  surfaceId: "main",
});

handle.update();
handle.unmount();
```

Web Component 复用同一个 `DomSurfaceHost`，不复制渲染逻辑。

### Web Component wrapper

同时提供 Web Component：

```html
<a2ui-surface surface-id="main"></a2ui-surface>
```

`SurfaceGroupModel` 获取方式支持两种：

1. JS property：

```ts
element.surfaceGroup = surfaceGroup;
element.surfaceId = "main";
```

2. registry：

```ts
registerA2uiSurfaceGroup("default", surfaceGroup);
```

```html
<a2ui-surface group="default" surface-id="main"></a2ui-surface>
```

property 优先于 registry。

第一版 Web Component 默认使用 light DOM，以复用现有 `.a2ui-*` CSS。未来可增加 Shadow DOM 选项。

### Event dispatch compatibility

最终推荐从 mount container 或 custom element 派发事件，并设置：

```ts
{ bubbles: true, composed: true }
```

迁移期保留 `window.dispatchEvent` 兼容层，避免打断当前 frontend 对 `a2ui:action` 和 `a2ui:error` 的监听。

需要避免重复处理：事件兼容策略必须在 mount option 或文档中明确。

### Ignore legacy Vue components

`src/components/basic/*Component.vue` 是 legacy 路径。本 scratch 不需要处理和保留它们。

迁移范围聚焦当前新链路：

- `src/ui/basic/*.vue`
- `src/render/vue-renderer.ts`
- `src/vue/A2uiSurface.vue`
- core model 中的 Vue reactivity imports
- renderer package 的 Vue 构建依赖

## Proposed Module Shape

```text
packages/renderer/src/
  core/
    data-model.ts
    component-model.ts
    surface-model.ts
    message-processor.ts
    data-context.ts
    dynamic-value.ts
    js-runtime/

  render/
    render-node.ts
    render-context.ts
    build-render-node.ts
    dependency-collector.ts
    resolve-props.ts
    resolve-model-bindings.ts
    resolve-action-bindings.ts
    resolve-slots.ts
    resolve-style.ts
    dom-renderer.ts

  dom/
    mount-surface.ts
    surface-host.ts
    state-store.ts
    surface-group-registry.ts
    web-component.ts
    focus-restoration.ts
    events.ts

  ui/
    dom-basic/
      index.ts
      types.ts
      Text.ts
      Image.ts
      Icon.ts
      Video.ts
      AudioPlayer.ts
      Divider.ts
      Row.ts
      Column.ts
      Grid.ts
      Container.ts
      Spacer.ts
      List.ts
      Card.ts
      Tabs.ts
      Button.ts
      TextField.ts
      CheckBox.ts
      ChoicePicker.ts
      Slider.ts
      DateTimeInput.ts
```

## Migration Strategy

### Phase 1: DOM-free core reactivity

- Remove Vue `reactive` from `DataModel`.
- Remove Vue `reactive` from `ComponentModel`.
- Replace reactive `SurfaceModel.components` and `SurfaceGroupModel._surfaces` with plain collections.
- Add explicit component/surface subscription hooks.
- Preserve current dataModel path behavior and tests.

### Phase 2: DOM surface host and mount API

- Add `DomSurfaceHost`.
- Add `mountA2uiSurface`.
- Reuse `buildRenderTree`.
- Implement dependency subscription synchronization.
- Implement microtask scheduling and synchronous `update()`.
- Implement focus restoration around full rebuild.

### Phase 3: DOM renderer and Basic UI components

- Add `renderDomNode`.
- Add `ui/dom-basic` component registry.
- Port all current formal Basic Catalog components from Vue UI to DOM API.
- Preserve existing `.a2ui-*` classes and style props.
- Map RenderNode events to DOM component `emit`.

### Phase 4: Web Component wrapper

- Add surface group registry.
- Add custom element class wrapping `DomSurfaceHost`.
- Support property and registry based `SurfaceGroupModel` injection.
- Default to light DOM.

### Phase 5: Frontend/demo migration

- Update renderer capability demo to use DOM mount API or Web Component.
- Update frontend preview integration to mount DOM renderer inside a host container.
- Keep action/error behavior compatible during migration.

### Phase 6: Vue dependency removal and closeout

- Remove Vue renderer exports.
- Delete Vue SFC renderer/UI files in migration scope.
- Update package dependencies, build scripts, tsconfig and vite config.
- Update docs and capability matrix.
- Run renderer typecheck/test/demo build.

## Acceptance Criteria

- `packages/renderer` no longer depends on `vue`.
- `packages/renderer` no longer requires `vue-tsc` or `@vitejs/plugin-vue`.
- `DataModel`, `ComponentModel`, `SurfaceModel`, and `SurfaceGroupModel` use no Vue reactivity APIs.
- DOM renderer reuses `buildRenderTree` and RenderNode resolver pipeline.
- First version uses dependency-triggered surface full rebuild, not DOM diff.
- Rebuilds are microtask batched by default.
- `handle.update()` performs synchronous rebuild.
- `handle.unmount()` cleans DOM, subscriptions, scheduled work and event listeners.
- Function mount API is exported.
- Web Component wrapper is exported/registrable and reuses `DomSurfaceHost`.
- Web Component supports both property injection and registry lookup, with property priority.
- Web Component renders into light DOM by default.
- DOM Basic UI components do not import A2UI core/protocol modules.
- TextField, CheckBox, ChoicePicker, Slider and DateTimeInput write back through `model-set` events.
- Button action event and action script behavior matches existing Renderer behavior.
- Dynamic `{ path }`, property script deps, model bindings and List repeated paths trigger rebuilds.
- List item relative `DataContext` behavior is preserved.
- Tabs active panel state survives full rebuild.
- Input focus and text selection are restored when possible after full rebuild.
- `a2ui:action` and `a2ui:error` continue to be consumable by existing frontend during migration.
- Legacy `src/components/basic/*Component.vue` is not treated as a preserved dependency.

## Documentation Impact

Product, design and contract docs are anchor documents. They should express the target architecture before implementation work starts.

Anchor docs to update before implementation:

- `docs/10-product/prd.md`: use framework-neutral Renderer wording instead of "Vue3 Renderer".
- `docs/20-design/renderer/README.md`: define Renderer as a framework-neutral DOM runtime with function mount API and Web Component boundaries.
- `docs/20-design/frontend/README.md`: clarify that Frontend can remain Vue while Renderer owns its DOM subtree.
- `docs/30-contracts/a2ui-v0.9.md`: state that A2UI protocol is frontend-framework independent.

Implementation docs are code-truth documents. They should continue to describe the real current code and only be updated as implementation work lands:

- `docs/40-implementation/modules/renderer/README.md`
- `docs/40-implementation/modules/renderer/basic-catalog-capabilities.md`
- `docs/40-implementation/modules/integration/README.md`
- `docs/40-implementation/modules/frontend/README.md`
- `docs/matt_docs/CONTEXT.md`, if used as active implementation glossary for the migrated code.

## Out Of Scope

- Rewriting A2UI protocol v0.9.
- Replacing JSRuntime or script security semantics.
- Proxy-based automatic dependency tracking.
- DOM diff, virtual DOM or per-node patching in the first version.
- Long-term Vue/DOM dual renderer support.
- Reintroducing `Modal` as a formal Basic Catalog component.
- Styling redesign beyond preserving current Basic UI behavior.
