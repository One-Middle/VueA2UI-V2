# Renderer UI Library Refactor

## Goal

重构 `packages/renderer` 的 Basic Catalog 渲染链路，创建一套不感知 A2UI 协议的普通 Vue 组件库，并让 Renderer 通过中间层把 A2UI component 声明解析为普通组件的 props、events 和 slots。

新链路目标：

- 普通 UI 组件只接收 Vue props、Vue slots，并 emit 普通事件。
- A2UI 协议能力集中在 Renderer 中间层。
- Basic Catalog 使用单一 TypeScript catalog definition 作为事实源。
- Renderer 先生成轻量 RenderNode，再由 Vue renderer 转为 VNode。
- 旧 `packages/renderer/src/components/basic/*.vue` 保留为 legacy reference，但新链路不依赖它们。

## Problem

当前 Basic 组件同时承担普通 UI 渲染和 A2UI 协议解释：

- 组件通过 `componentContextKey` 读取 `ComponentModel`、`DataContext` 和 action 派发能力。
- 容器组件直接递归渲染 `A2uiComponent`。
- `{ path }` 动态值、属性脚本、表单写回、action、child/children 解析散落在旧 Basic 组件和 `A2uiComponent.vue` 中。
- Agent prompt、Catalog schema、shared 组件名称、Renderer registry 和文档中存在多份 Catalog 信息，容易漂移。

本次重构要把协议解释和普通 UI 组件彻底分层。

## Core Decisions

### Plain UI components

新普通组件库不感知 A2UI。

普通组件禁止依赖：

- `componentContextKey`
- `ComponentModel`
- `DataContext`
- `A2uiComponent`
- A2UI `action`
- A2UI `{ path }` binding

普通组件只暴露常规 Vue API，例如：

- props: `modelValue`、`label`、`disabled`、`loading`、`variant`、`size`
- events: `click`、`update:modelValue`
- slots: `default`、Tabs scoped default slot 等

### Catalog scope

新普通组件库迁移当前正式开放的 Basic Catalog，不包含 `Modal`。

迁移范围：

- `Text`
- `Image`
- `Icon`
- `Video`
- `AudioPlayer`
- `Divider`
- `Row`
- `Column`
- `Grid`
- `Container`
- `Spacer`
- `List`
- `Card`
- `Tabs`
- `Button`
- `TextField`
- `CheckBox`
- `ChoicePicker`
- `Slider`
- `DateTimeInput`

`Modal` 从新的正式 Catalog 中移除，后续 Agent prompt 不再暴露该组件，`validateA2UI` 不再放行新 Catalog 下的 `Modal`。旧 `ModalComponent.vue` 继续留在 legacy basic 目录中作为历史参考。

### No fallback to old Basic components

新 Renderer 链路不做“未迁移组件 fallback 到旧组件”的混合运行。

正式 Catalog 中存在的组件必须由新普通组件库和新 Renderer 链路完整支持。正式 Catalog 外组件走统一未注册组件处理，不为 `Modal` 设计专属 fallback。

### Single catalog source

Basic Catalog 单一事实源使用 TypeScript object 定义，再派生 JSON Schema。

Catalog definition 同时描述：

- 组件名称和说明。
- 字段 schema。
- 字段语义。
- 字段到普通组件 props/events/slots 的映射。

不引入 `availableToAgent` 或 `implementedByRenderer` 灰度状态。Catalog 中有就表示 Agent 可生成、Validator 可通过、Renderer 可渲染、Docs 应记录；Catalog 中没有就不属于当前正式支持集合。

### Field semantics

Catalog 字段语义用于驱动 Renderer resolver，而不是改变 A2UI 协议。

字段角色暂定：

- `prop`: 普通 Vue prop 映射。
- `display`: 展示内容字段，例如 `text`、`title`、`label`、`alt`。
- `visual`: 视觉字段，例如 `variant`、`size`、`tone`、`alignment`。
- `state`: 交互状态字段，例如 `disabled`、`loading`、`readonly`。
- `model`: 表单或受控值字段。
- `action`: 现有 A2UI action 字段的事件映射。
- `slot`: 子组件或内容区域字段。

实现上不拆 `resolveDisplayProps` 和 `resolveVisualProps`。`prop`、`display`、`visual`、`state` 统一由 `resolveProps` 处理。

### RenderNode pipeline

新链路采用：

```text
A2UI componentId
→ buildRenderNode(componentId, basePath)
→ RenderNode
→ renderVueNode(renderNode)
→ VNode
```

`RenderNode` 是 Renderer 内部协议解析结果，不是对外协议，也不是跨端 UI DSL。

`RenderNode` 包含最小 `meta`：

```ts
export interface RenderNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  events?: Record<string, RenderEventIntent>;
  slots?: Record<string, RenderSlotValue>;
  meta: RenderNodeMeta;
}

export interface RenderNodeMeta {
  surfaceId: string;
  componentId: string;
  basePath: string;
}
```

`meta` 只服务 Renderer 内部，用于错误定位、action source、动态 List item 作用域等场景，不透传给普通组件。

### Unified resolver pipeline

Renderer 中间层只有统一 resolver 管线：

```text
buildRenderNode
→ resolveProps
→ resolveModelBindings
→ resolveActionBindings
→ resolveSlots
→ RenderNode
```

`List` 和 `Tabs` 的特殊性不作为公开的 structure strategy 概念暴露，而是通过 Catalog slot rule 表达，并由 `resolveSlots` 按 mode 处理。

### Slot rules

A2UI 的结构字段不透传给普通组件，而是在中间层解析为 `RenderNode.slots`。

`RenderNode.slots` 表示 Renderer 内部内容区域，不等同于 Vue runtime slots。Vue renderer 负责把它翻译成真实 Vue slots。

Slot rule mode 暂定：

```ts
type SlotRule =
  | {
      mode: "component";
      source: "child";
      target: "default";
    }
  | {
      mode: "componentList";
      source: "children";
      target: "default";
    }
  | {
      mode: "repeatedComponent";
      source: "children";
      target: "default";
      pathField: "path";
      componentIdField: "componentId";
    }
  | {
      mode: "tabPanels";
      source: "tabItems" | "tabs";
      target: "panels";
      titleField: "title";
      childField: "child";
    };
```

规则：

- `child: "componentId"` 解析为 `slots.default`。
- `children: ["a", "b"]` 解析为 `slots.default`。
- `List.children: [{ path, componentId }]` 读取 dataModel 数组，为每个 item 生成独立 `basePath`，并展开为 `slots.default`。
- `Tabs.tabItems/tabs` 解析为 `props.items` 和 `slots.panels`。

### Tabs rendering

`Tabs` 使用结构化 `panels` slot payload，不使用动态具名 slots。

RenderNode 形状：

```ts
{
  type: "Tabs",
  props: {
    items: [
      { key: "overview", title: "Overview", disabled: false },
      { key: "details", title: "Details", disabled: false }
    ]
  },
  slots: {
    panels: [
      { key: "overview", nodes: [overviewRenderNode] },
      { key: "details", nodes: [detailsRenderNode] }
    ]
  },
  meta
}
```

`UiTabs` 管理 active key。Vue renderer 通过 `UiTabs` 的 scoped default slot 获取 `activeKey`，再从 `RenderNode.slots.panels` 选择当前 panel 的 nodes 渲染。

`UiTabs` 不直接接收 `panels` 数据，不接收 RenderNode。

### Model bindings

Catalog 中 `role: "model"` 的字段映射到普通组件目标 prop。

规则：

- model 字段映射到 `targetProp`，通常是 `modelValue`。
- 只有 A2UI 原值是 `{ path }` 时，才生成 `update:modelValue` 写回事件。
- model 字段被消费后不保留 A2UI 原字段名。

示例：

```ts
{
  text: {
    role: "model",
    targetProp: "modelValue",
    updateEvent: "update:modelValue"
  }
}
```

`text: "hello"` 只生成：

```ts
props.modelValue = "hello";
```

`text: { path: "/form/name" }` 生成：

```ts
props.modelValue = dataModel.get("/form/name");
events["update:modelValue"] = { kind: "model-set", path: "/form/name" };
```

### Action bindings

不修改当前 A2UI `action` 协议。

第一阶段只记录现有协议事实：

```text
Button.action -> UiButton click
```

`resolveActionBindings` 只处理 Catalog 明确声明的 action 字段，不把 action 泛化开放给任意组件。

A2UI 仍然使用当前结构：

```ts
{
  action: {
    event: { name: "submit", context: {} }
  }
}
```

Renderer 中间层消费 `action` 后生成事件意图：

```ts
events.click = {
  kind: "action-event",
  name: "submit",
  context: {},
};
```

Vue renderer 再把事件意图转换为普通 Vue event handler。

### Dynamic values and scripts

动态属性能力保持旧链路现有语义。

规则：

- `resolveDynamicValue` 继续放在 `core`。
- `render` 层调用 `resolveDynamicValue`。
- 新普通组件库不得 import `core/dynamic-value`。
- 本次不新增 Catalog 级 script allowlist。
- `script.deps`、fallback 和错误派发沿用旧链路行为。

### Core model boundaries

`ComponentModel` 留在 `core`，作为 A2UI 协议状态模型。

边界：

```text
ComponentModel -> RenderNode -> UiComponent
```

规则：

- `buildRenderNode` 从 `SurfaceModel.components` 读取 `ComponentModel`。
- resolver 可以读取 `ComponentModel.getProperty`、`getStaticChildren`、`getDynamicChild` 等现有能力。
- `RenderNode` 不携带 `ComponentModel` 实例。
- 普通组件不接收也不 import `ComponentModel`。

### No componentContextKey in new path

新 Renderer 链路不使用 `componentContextKey`。

规则：

- `componentContextKey` 只属于 legacy Vue Basic 链路。
- 新 `ui/basic` 组件不得 import `componentContextKey`。
- 新 `ui/basic` 组件不得 import `ComponentModel`、`DataContext`、`A2uiComponent`。
- 新 `render` 层通过 `RenderContext` 参数传递 `surfaceId`、`componentId`、`basePath`、`dataModel`、错误派发和 action 派发能力。

### No A2uiComponent recursion in new path

新链路不再使用旧 `A2uiComponent.vue` 作为递归入口。

新入口：

```text
A2uiSurface.vue
→ buildRenderNode(rootComponentId, "/")
→ renderVueNode(renderNode)
```

子组件递归由 `buildRenderNode(childId, basePath)` 完成，Vue renderer 递归渲染 `RenderNode`，不再递归渲染 `A2uiComponent`。

## Reactivity Strategy

第一版采用 dependency-collected tree rebuild。

含义：

- 依赖收集是细粒度的。
- RenderNode tree 重建可以是整棵树的。

流程：

```text
buildRenderNode(componentId, basePath)
→ resolver 解析字段并收集依赖
→ 返回 RenderNode tree + dependencies
→ A2uiSurface watch dependencies
→ 根据 dependencies 同步 DataModel 订阅
→ 依赖路径变化时递增 renderRevision
→ computed 重新 build RenderNode tree
```

规则：

- `{ path }` 动态引用解析时收集 resolved absolute path。
- property script 的 deps 解析时收集 resolved absolute deps。
- model binding 的 `{ path }` 收集同一个 resolved absolute path。
- List repeated path 收集数组路径。
- `computed` 只产出 `RenderNode + dependencies`，不注册订阅。
- `watch` 负责同步 DataModel 订阅。
- 每次重建后替换订阅集合，移除不再需要的依赖。
- dependencies 使用 `Set` 去重，最终输出排序后的 `string[]`。

结果类型：

```ts
interface BuildRenderTreeResult {
  node: RenderNode | null;
  dependencies: string[];
}
```

订阅同步：

```text
syncSubscriptions(dependencies)
→ 新 deps 中没有的旧订阅：unsubscribe
→ 旧 deps 中没有的新路径：dataModel.subscribe(path, () => renderRevision++)
→ 已存在路径：保留
→ 组件卸载时：全部 unsubscribe
```

## Proposed Module Shape

```text
packages/shared/src/basic-catalog/
  catalog-definition.ts
  types.ts
  json-schema.ts

packages/renderer/src/
  core/
    message-processor.ts
    surface-model.ts
    data-model.ts
    data-context.ts
    component-model.ts
    dynamic-value.ts
    js-runtime/

  ui/
    basic/
      Text.vue
      Image.vue
      Icon.vue
      Video.vue
      AudioPlayer.vue
      Divider.vue
      Row.vue
      Column.vue
      Grid.vue
      Container.vue
      Spacer.vue
      List.vue
      Card.vue
      Tabs.vue
      Button.vue
      TextField.vue
      CheckBox.vue
      ChoicePicker.vue
      Slider.vue
      DateTimeInput.vue

  render/
    render-node.ts
    render-context.ts
    build-render-node.ts
    dependency-collector.ts
    resolve-props.ts
    resolve-model-bindings.ts
    resolve-action-bindings.ts
    resolve-slots.ts
    vue-renderer.ts
```

Existing legacy files remain:

```text
packages/renderer/src/components/basic/*.vue
packages/renderer/src/vue/A2uiComponent.vue
packages/renderer/src/vue/context.ts
```

They are retained as reference during migration but are not dependencies of the new path.

## Migration Strategy

### Phase 1: Catalog source

- Add TypeScript Basic Catalog definition without `Modal`.
- Generate or expose JSON Schema from the catalog definition.
- Update Agent catalog detail helpers to read from the catalog definition.
- Keep validation behavior equivalent for still-supported components.

### Phase 2: UI component library

- Create `packages/renderer/src/ui/basic`.
- Port visual behavior from legacy Basic components into plain Vue components.
- Remove A2UI imports from new UI components.
- Keep props/events/slots conventional.

### Phase 3: RenderNode builder

- Add RenderNode types and RenderContext.
- Implement `resolveProps`.
- Implement `resolveModelBindings`.
- Implement `resolveActionBindings`.
- Implement `resolveSlots`.
- Implement dependency collector and build result.

### Phase 4: Vue renderer

- Implement `renderVueNode`.
- Map RenderNode events to Vue event handlers.
- Translate RenderNode slots to Vue slots.
- Implement Tabs activeKey scoped slot rendering.

### Phase 5: Surface integration

- Update `A2uiSurface.vue` to use the new build/render path.
- Add dependency watch and subscription synchronization.
- Keep old `A2uiComponent.vue` unused by new path.

### Phase 6: Prompt, validation, and docs sync

- Remove `Modal` from Agent prompt-visible Catalog.
- Update `validateA2UI` schema derivation.
- Update Basic Catalog docs and shared module docs.
- Add migration notes explaining legacy components remain as reference only.

## Acceptance Criteria

- New `ui/basic` components do not import A2UI core, context, or legacy renderer modules.
- New Renderer path does not use `componentContextKey`.
- New Renderer path does not recurse through `A2uiComponent.vue`.
- `Modal` is absent from the new Basic Catalog source and Agent prompt-visible component list.
- `TextField`, `CheckBox`, `ChoicePicker`, `Slider`, and `DateTimeInput` use `modelValue` and `update:modelValue` in ordinary Vue style.
- `Button.action` still follows existing A2UI protocol and maps to `UiButton` click.
- `child` and `children` do not pass through to ordinary components.
- `List.children [{ path, componentId }]` expands into `slots.default` with per-item `basePath`.
- `Tabs.tabItems/tabs` maps to `props.items` and `slots.panels`, with active panel rendering controlled by Vue renderer.
- Dynamic `{ path }` values, property script deps, model bindings, and List paths are collected as dependencies.
- Dependency arrays are deduplicated and sorted.
- `computed` remains pure and `watch` owns subscription side effects.
- Existing Renderer behavior for supported components is preserved unless this spec explicitly changes it.

## Out Of Scope

- Rewriting the A2UI protocol version.
- Adding `Modal` to the new component library.
- Designing component gray release states.
- Supporting non-Vue rendering runtimes.
- Exposing RenderNode as public API.
- Replacing the existing JS runtime.
- Changing current property script permission semantics.
- Creating per-node incremental RenderNode updates in the first version.
