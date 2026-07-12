# A2UI v0.9 渲染器实现指南

本文基于官方工程 `D:\Code\a2ui` 中的 0.9 版本实现整理，重点参考：

- `renderers/react/src/v0_9`
- `renderers/web_core/src/v0_9`
- `specification/v0_9/docs/renderer_guide.md`
- `specification/v0_9/catalogs/basic/catalog.json`

目标不是复述 React 代码，而是说明如果要实现一个新的 A2UI 渲染器，应该如何拆分架构，以及渲染器必须具备哪些能力。

## 1. 总体架构

A2UI v0.9 的客户端渲染可以分成两层：

1. 框架无关层：负责协议消息、状态模型、数据绑定、函数执行、校验、能力上报。
2. 框架渲染层：负责把状态模型绘制成 React/Vue/Angular/Flutter/原生 UI 等具体视图。

典型数据流如下：

```text
Agent JSON messages
  -> MessageProcessor
  -> SurfaceGroupModel / SurfaceModel
  -> A2uiSurface framework entry
  -> ComponentImplementation
  -> native UI tree
```

React 0.9 渲染器本身很薄：它不直接解析协议消息，而是消费 `@a2ui/web_core/v0_9` 提供的 `SurfaceModel`，从 `root` 组件开始递归渲染组件树。

## 2. 最小可运行闭环

实现一个渲染器至少需要这些对象：

- `Catalog`：声明当前渲染器支持哪些组件和函数。
- `MessageProcessor`：接收 `createSurface`、`updateComponents`、`updateDataModel`、`deleteSurface` 等消息，并更新模型。
- `SurfaceModel`：一个独立 UI surface 的状态，包含 `dataModel`、`componentsModel`、`catalog`、`theme`、`sendDataModel`。
- `ComponentModel`：组件的扁平配置，包含 `id`、`type` 和 `properties`。
- `ComponentContext`：组件渲染时的上下文，连接组件配置、数据作用域、action 派发能力。
- `DataContext`：解析 `{ path }`、函数调用、相对路径，并向 data model 写入值。
- `ComponentImplementation`：框架相关组件实现，包含组件 API schema 和实际 render/build 方法。
- `Surface` 入口组件：从 `root` 开始查找组件类型，创建 context，并调用对应 implementation。

React 中对应入口是：

```tsx
<A2uiSurface surface={surface} />
```

它固定从 `id = "root"`、`basePath = "/"` 开始渲染。

## 3. 协议消息处理能力

渲染器所在客户端必须能处理 0.9 的 server-to-client 消息：

- `createSurface`：创建 surface，并按 `catalogId` 绑定可用 catalog。
- `updateComponents`：新增或更新组件配置。
- `updateDataModel`：更新指定 JSON Pointer 路径上的数据。
- `deleteSurface`：删除 surface 并清理资源。

需要特别注意：

- 如果 `updateComponents` 更新了已有组件但 `component` 类型变了，应该删除旧组件并重新创建，避免框架内部状态串到新类型上。
- `createSurface` 不能重复创建同一个 `surfaceId`。
- `updateDataModel` 必须能更新根路径 `/`，也必须能更新深层路径。
- 如果 surface 开启 `sendDataModel`，客户端在发送 action 时需要能聚合并回传当前 data model。

## 4. 状态模型与响应式能力

渲染器必须支持细粒度响应式，而不是每次消息都整棵树重绘。

核心模型职责：

- `SurfaceComponentsModel`
  - 用扁平 map 管理组件。
  - 提供 `onCreated`、`onDeleted` 事件。
  - 支持按 id 查询组件。
- `ComponentModel`
  - 保存当前组件 properties。
  - properties 改变时发出 `onUpdated`。
- `DataModel`
  - 支持 JSON Pointer 读写。
  - 支持订阅某个 path。
  - path 更新时通知自身、祖先和后代订阅者。
  - 设置深层路径时需要自动创建中间对象或数组。
  - 设置对象字段为 `undefined` 时删除 key；数组位置则保留数组长度。

React 渲染器使用 `useSyncExternalStore` 对接这些外部 store，保证 React 能安全订阅模型变化。

## 5. 数据绑定能力

A2UI 组件的属性不是都可以直接当静态值使用。渲染器必须能处理几类不同属性：

- 静态属性：如 `variant: "primary"`，直接传给组件。
- 动态值：如 `{ path: "/title" }`，需要从 `DataModel` 解析，并在数据变化时重新渲染。
- 函数调用：如 `{ call: "formatString", args: ... }`，需要执行 catalog 函数，并响应依赖变化。
- Action：如 Button 的 `action`，需要解析成可调用函数，点击时派发 client action 或执行 function call。
- Structural props：如 `child`、`children`，不是数据值，而是组件 id 或子组件模板，需要交给 surface 递归构建。
- Checkable：如 `checks`，需要计算校验状态，并向组件注入 `isValid`、`validationErrors`。

React 0.9 的关键设计是 `GenericBinder`：

- 根据组件 Zod schema 判断字段行为。
- 自动订阅动态数据。
- 把动态值解析成普通 props。
- 为动态字段生成 setter，例如 `value` 会生成 `setValue`。
- 把 action 解析成 `() => void`。
- 对 `checks` 生成 `isValid` 和 `validationErrors`。
- 在组件卸载或 context 改变时释放订阅。

如果目标语言没有类似 TypeScript/Zod 的运行时 schema 反射能力，可以为基础组件手写 binder，或者采用代码生成。

## 6. Surface 递归渲染能力

Surface 入口需要做四件事：

1. 从 `root` 组件开始渲染。
2. 根据组件 `type` 在 catalog 中找到 implementation。
3. 为组件创建 `ComponentContext(surface, id, basePath)`。
4. 给组件提供 `buildChild(id, basePath?)`，用于递归渲染子组件。

React 实现中有两个重要细节：

- 子组件不存在时先显示 loading fallback，后续 streaming 消息创建组件后，子组件自己刷新，父组件不必重渲染。
- `buildChild` 默认继承当前 `context.dataContext.path`。这对列表模板非常关键，否则相对路径会解析到根路径，导致嵌套列表里的数据为空。

ChildList 支持两种形式：

```ts
["title", "body"]
```

以及由 binder 解析后的模板列表：

```ts
[
  { id: "rowTemplate", basePath: "/items/0" },
  { id: "rowTemplate", basePath: "/items/1" }
]
```

渲染器必须保留 `basePath`，并把它传给子组件 context。

## 7. Action 与双向绑定能力

交互组件需要把用户操作写回 A2UI 状态或派发 action。

常见模式：

- `TextField`：输入变化时调用 `props.setValue(e.target.value)`。
- `CheckBox`：勾选变化时调用 `props.setValue(e.target.checked)`。
- `ChoicePicker`：选择项变化时写回字符串数组。
- `Slider`：滑动后写回 number。
- `DateTimeInput`：写回 date/time/datetime 字符串。
- `Button`：点击时调用 `props.action()`。

其中 `setValue` 不是组件自己写死的，而是 binder 根据 `value: DynamicString/DynamicBoolean/DynamicNumber/...` 自动注入的。只有当原始属性是 `{ path: "..." }` 这类数据绑定时，setter 才能写回 data model。

Button 等 action 组件还需要支持：

- 点击前解析 action context 中的动态值。
- action 中包含 event 时，经 `SurfaceModel.dispatchAction` 发给外部监听器。
- 有 validation error 时禁用或阻止 action。

## 8. Basic Catalog 组件能力

React 0.9 basic catalog 实现了这些组件：

- 内容类：`Text`、`Image`、`Icon`、`Video`、`AudioPlayer`、`Divider`
- 布局类：`Row`、`Column`、`List`、`Card`、`Tabs`、`Modal`
- 交互类：`Button`、`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`

实现一个兼容 basic catalog 的渲染器，需要覆盖以下能力。

### Text

- 支持 `text: DynamicString`。
- 支持 `variant: h1/h2/h3/h4/h5/caption/body`。
- body 或未知 variant 走 Markdown 渲染管线。
- 没有配置 Markdown renderer 时应降级显示纯文本。

### Image

- 支持 `url`、`description`、`fit`。
- 支持 `icon`、`avatar`、`smallFeature`、`mediumFeature`、`largeFeature`、`header` 等尺寸语义。
- `description` 应映射为无障碍说明。

### Icon

- 支持标准 icon name。
- 支持自定义 `{ svgPath }`。
- Web 实现默认映射到 Material Symbols，其他平台可映射到本平台图标系统。

### Video / AudioPlayer

- 支持媒体 URL。
- 提供基础播放控件。
- AudioPlayer 支持描述文本。

### Row / Column

- 支持 `children: ChildList`。
- 支持 `justify` 和 `align`。
- 支持 `weight`，在 Web 中映射为 flex 权重，并加 `min-width: 0` / `min-height: 0` 防止溢出。

### List

- 支持横向和纵向布局。
- 支持固定 child list 和模板 child list。
- 模板 child list 必须正确传递每个 item 的 `basePath`。

### Card

- 支持单个 `child`。
- 多个内容必须由 Row/Column/List 包起来后作为 child。
- 支持主题变量控制边框、圆角、背景、阴影、padding。

### Tabs

- 支持 `tabs: [{ title, child }]`。
- title 是动态字符串。
- 内部维护当前选中 tab。
- 渲染 active tab 的 child。

### Modal

- 支持 `trigger` 和 `content`。
- 点击 trigger 打开，点击遮罩或关闭按钮关闭。
- 内容区域递归渲染 child。

### Button

- 支持 `child`、`variant`、`action`、`checks`。
- 点击触发 action。
- `isValid === false` 时禁用。

### TextField

- 支持 `label`、`value`、`variant`、`checks`。
- `variant` 映射到短文本、长文本、数字、密码输入。
- 输入变化写回 data model。
- 显示第一个 validation error。

### CheckBox

- 支持 `label`、`value`、`checks`。
- 勾选变化写回 boolean。
- 显示 validation error。

### ChoicePicker

- 支持单选和多选。
- 支持 checkbox 或 chips 样式。
- 支持 filterable 搜索。
- 选中值写回 string array。

### Slider

- 支持 `label`、`min`、`max`、`step`、`value`、`checks`。
- 滑动变化写回 number。
- 显示当前值。

### DateTimeInput

- 支持 date、time、datetime-local 三种模式。
- 支持 `min`、`max`。
- 输入变化写回字符串。
- `enableDate` 和 `enableTime` 都为 false 时不渲染。

## 9. 样式与主题能力

React basic catalog 主要通过 CSS variables 做主题适配，例如：

- `--a2ui-color-surface`
- `--a2ui-color-on-surface`
- `--a2ui-spacing-m`
- `--a2ui-border`
- `--a2ui-card-padding`
- `--a2ui-button-*`

渲染器应具备：

- 注入或加载 basic catalog 默认样式的能力。
- 接收 surface `theme` 的能力。
- 将主题映射到本平台样式系统。
- 为每个组件提供合理默认样式。
- 不依赖 agent 总是提供完整样式参数。

React 的 `useBasicCatalogStyles()` 会调用 `injectBasicCatalogStyles()`，把 `web_core` 的基础样式注入到页面。

## 10. Markdown 能力

Text 组件支持 Markdown，但 React 渲染器没有内置具体 Markdown 引擎，而是暴露：

```tsx
<MarkdownContext.Provider value={renderer}>
  <A2uiSurface surface={surface} />
</MarkdownContext.Provider>
```

渲染器实现时可以选择：

- 内置安全的 Markdown renderer。
- 通过 context/provider/plugin 注入 renderer。
- 没有 renderer 时降级为纯文本。

需要注意 Markdown 输出必须考虑 XSS/HTML 安全策略。

## 11. 函数与表达式能力

Catalog 不只包含组件，还包含函数。Basic catalog 的重要函数包括字符串格式化、逻辑校验、表达式解析等。

渲染器需要支持：

- 函数 API schema。
- 函数实现注册。
- 函数参数校验。
- 在 `DataContext` 中执行函数。
- 函数参数里继续解析动态值。
- 函数结果参与响应式更新。
- 函数错误以 client error 或 surface error 形式上报。

特别要注意：字符串插值和表达式解析应集中在 `formatString` 这类函数中，不要对所有字符串做全局插值，否则会改变协议语义。

## 12. 自定义组件与自定义 Catalog

一个好用的渲染器应允许第三方扩展 catalog。

React 的方式是：

```ts
const MyComponent = createComponentImplementation(MyApi, ({ props, buildChild, context }) => {
  return ...;
});

const myCatalog = new Catalog("https://example.com/catalog.json", [
  ...basicComponents,
  MyComponent,
], functions);
```

渲染器需要提供两类扩展路径：

- 普通组件工厂：自动绑定 schema，开发者只写 UI。
- binderless 组件工厂：开发者直接拿 `ComponentContext`，手动管理订阅，适合调试、特殊性能场景或复杂组件。

## 13. 生命周期与内存安全

渲染器必须明确订阅所有权：

- `MessageProcessor` 拥有长生命周期 model。
- framework view 拥有 `ComponentContext` 和 binding。
- 组件挂载时才订阅数据。
- 组件卸载时必须释放订阅。
- 组件属性从一个 path 改成另一个 path 时，必须取消旧 path 订阅。
- surface 删除时，必须 dispose data model、component model 和事件监听器。

React 实现中：

- `GenericBinder.dispose()` 清理 data listeners 和 component update listener。
- wrapper 组件在 unmount 时调用 dispose。
- `DeferredChild` 只订阅自己关心的 component id 的创建和删除，避免父组件被无关更新拖着重渲染。

## 14. 错误与降级能力

渲染器应有明确 fallback：

- 组件 id 暂不存在：显示 loading 或空占位，等待 streaming 后续消息。
- 组件 type 不在 catalog 中：显示或上报 unknown component。
- 动态表达式执行失败：上报 expression error，并让对应值降级为 undefined/空状态。
- action payload 不合法：不发送，记录错误。
- schema 校验失败：在消息处理层阻止非法数据进入状态模型。

React 当前 fallback：

- 缺失组件显示 `[Loading id...]`。
- 未知组件显示 `Unknown component: type`。

## 15. 测试要求

实现渲染器时建议至少覆盖这些测试：

- 协议消息：create/update/delete surface，update components，update data model。
- DataModel：JSON Pointer、深层 set、数组路径、祖先/后代通知。
- ComponentModel：properties 更新触发订阅。
- Binder：动态值解析、path 切换、action 解析、checks 校验、setter 写回。
- Surface：root 渲染、未知组件、missing child 后续补齐。
- ChildList 模板：列表数据变化后渲染项数变化，且相对 path 正确。
- 交互组件：输入控件写回 data model，按钮派发 action。
- Basic catalog examples：跑 `specification/v0_9/catalogs/basic/examples` 中的样例。
- 视觉一致性：如果有多个 Web renderer，可用 visual parity 测试对齐布局。

React 0.9 测试中特别验证了：

- 动态 data model 更新会刷新组件文本。
- 组件卸载会清理订阅。
- streaming 场景下，父组件先渲染 missing child，后续 child 到达时只刷新 child。
- 登录表单输入会写回 `surface.dataModel`。

## 16. 推荐实现顺序

建议按这个顺序做：

1. 实现协议类型和 JSON schema 校验。
2. 实现事件/信号基础设施。
3. 实现 `DataModel`、`ComponentModel`、`SurfaceComponentsModel`、`SurfaceModel`、`SurfaceGroupModel`。
4. 实现 `DataContext`、`ComponentContext`。
5. 实现 `MessageProcessor`。
6. 实现 `Catalog`、函数注册与 client capabilities 生成。
7. 实现目标框架的 `ComponentImplementation` 接口。
8. 实现 Surface 入口和递归 `buildChild`。
9. 先实现 `Text`、`Row`、`Column`、`Button`、`TextField`。
10. 实现 dynamic binding、action、setter、checks。
11. 跑简单 examples 和交互测试。
12. 补齐全部 basic catalog 组件。
13. 建 Gallery/Explorer，支持逐条处理消息、查看 data model 和 action log。
14. 补视觉一致性和复杂样例测试。

## 17. 渲染器能力清单

一个完整的 A2UI v0.9 渲染器应具备：

- 能解析并处理 v0.9 消息。
- 能维护多 surface 状态。
- 能按 catalog 查找组件和函数。
- 能从 `root` 递归渲染组件树。
- 能处理 streaming/progressive rendering。
- 能处理 unknown/missing component fallback。
- 能解析动态值、相对路径和函数调用。
- 能订阅 data model 并细粒度刷新。
- 能为输入类组件提供双向绑定 setter。
- 能派发 action，并解析 action context。
- 能支持 Checkable 校验和 action blocking。
- 能正确渲染 ChildList 和列表模板。
- 能传递嵌套组件的 `basePath`。
- 能支持主题和默认样式。
- 能支持 Markdown 或安全降级。
- 能允许自定义组件、自定义函数、自定义 catalog。
- 能生成 client capabilities。
- 能聚合 `sendDataModel` surface 的客户端数据。
- 能在卸载、删除 surface、切换绑定 path 时清理订阅。
- 能用官方 examples 做集成验证。

## 18. React 0.9 参考实现的关键文件

- `renderers/react/src/v0_9/A2uiSurface.tsx`：Surface 入口、DeferredChild、递归渲染。
- `renderers/react/src/v0_9/adapter.tsx`：React component factory、GenericBinder 接入、生命周期清理。
- `renderers/react/src/v0_9/catalog/basic/index.ts`：basic catalog 组装。
- `renderers/react/src/v0_9/catalog/basic/components/*`：basic catalog 的 React 组件实现。
- `renderers/web_core/src/v0_9/rendering/generic-binder.ts`：动态绑定、action、checks、ChildList 模板解析。
- `renderers/web_core/src/v0_9/rendering/data-context.ts`：动态值、相对路径、函数调用解析。
- `renderers/web_core/src/v0_9/state/data-model.ts`：JSON Pointer 数据模型和响应式通知。
- `renderers/web_core/src/v0_9/processing/message-processor.ts`：协议消息进入状态模型。

## 19. React Renderer 支持的 v0.9 JSON Schema

这里的“支持范围”特指官方 React renderer 这条链路实际使用的 A2UI v0.9 schema：

```text
@a2ui/react/v0_9
  -> A2uiSurface / adapter / basicCatalog React components
@a2ui/web_core/v0_9
  -> MessageProcessor / SurfaceModel / DataModel / GenericBinder / Catalog
```

也就是说，本节不是完整 A2UI 协议全集，而是 React Renderer 能渲染、绑定、交互和上报所依赖的 schema。React 包本身不直接解析 JSON 消息，消息解析和状态模型由 `@a2ui/web_core/v0_9` 提供；React 包负责消费 `SurfaceModel` 并渲染 basic catalog 或自定义 catalog 的组件。

React Renderer 相关完整 schema 位于官方工程：

- `D:\Code\a2ui\specification\v0_9\json\server_to_client.json`
- `D:\Code\a2ui\specification\v0_9\json\server_to_client_list.json`
- `D:\Code\a2ui\specification\v0_9\json\server_to_client_list_wrapper.json`
- `D:\Code\a2ui\specification\v0_9\json\client_to_server.json`
- `D:\Code\a2ui\specification\v0_9\json\client_to_server_list.json`
- `D:\Code\a2ui\specification\v0_9\json\client_to_server_list_wrapper.json`
- `D:\Code\a2ui\specification\v0_9\json\client_capabilities.json`
- `D:\Code\a2ui\specification\v0_9\json\client_data_model.json`
- `D:\Code\a2ui\specification\v0_9\json\common_types.json`
- `D:\Code\a2ui\specification\v0_9\catalogs\basic\catalog.json`

不属于 React Renderer 当前讨论范围的 schema 包括 `server_capabilities.json`、`sample.json`、v0.9.1/v1.0 版本 schema，以及非 basic catalog 的第三方 catalog。第三方 catalog 可以通过 `Catalog` 扩展，但不属于官方 React basic renderer 的内置支持面。

下面是 React Renderer 这条链路应当内置或等价支持的 schema 结构。代码块是面向实现的精简版，字段、required 约束和 oneOf 关系应与官方 schema 保持一致。

### React 输入：Server to Client

React Renderer 的输入不是原始 JSON，而是由 `MessageProcessor` 处理后得到的 `SurfaceModel`。因此，在 React 渲染链路中，`@a2ui/web_core/v0_9` 必须能接收并校验 4 类服务端消息：创建 surface、更新组件、更新数据模型、删除 surface。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://a2ui.org/specification/v0_9/server_to_client.json",
  "type": "object",
  "oneOf": [
    {"$ref": "#/$defs/CreateSurfaceMessage"},
    {"$ref": "#/$defs/UpdateComponentsMessage"},
    {"$ref": "#/$defs/UpdateDataModelMessage"},
    {"$ref": "#/$defs/DeleteSurfaceMessage"}
  ],
  "$defs": {
    "CreateSurfaceMessage": {
      "type": "object",
      "properties": {
        "version": {"const": "v0.9"},
        "createSurface": {
          "type": "object",
          "properties": {
            "surfaceId": {"type": "string"},
            "catalogId": {"type": "string"},
            "theme": {"$ref": "catalog.json#/$defs/theme"},
            "sendDataModel": {"type": "boolean"}
          },
          "required": ["surfaceId", "catalogId"],
          "additionalProperties": false
        }
      },
      "required": ["createSurface", "version"],
      "additionalProperties": false
    },
    "UpdateComponentsMessage": {
      "type": "object",
      "properties": {
        "version": {"const": "v0.9"},
        "updateComponents": {
          "type": "object",
          "properties": {
            "surfaceId": {"type": "string"},
            "components": {
              "type": "array",
              "minItems": 1,
              "items": {"$ref": "catalog.json#/$defs/anyComponent"}
            }
          },
          "required": ["surfaceId", "components"],
          "additionalProperties": false
        }
      },
      "required": ["updateComponents", "version"],
      "additionalProperties": false
    },
    "UpdateDataModelMessage": {
      "type": "object",
      "properties": {
        "version": {"const": "v0.9"},
        "updateDataModel": {
          "type": "object",
          "properties": {
            "surfaceId": {"type": "string"},
            "path": {"type": "string"},
            "value": {"additionalProperties": true}
          },
          "required": ["surfaceId"],
          "additionalProperties": false
        }
      },
      "required": ["updateDataModel", "version"],
      "additionalProperties": false
    },
    "DeleteSurfaceMessage": {
      "type": "object",
      "properties": {
        "version": {"const": "v0.9"},
        "deleteSurface": {
          "type": "object",
          "properties": {
            "surfaceId": {"type": "string"}
          },
          "required": ["surfaceId"],
          "additionalProperties": false
        }
      },
      "required": ["deleteSurface", "version"],
      "additionalProperties": false
    }
  }
}
```

`MessageProcessor.processMessages()` 支持消息数组形式：

```json
{
  "type": "array",
  "items": {"$ref": "server_to_client.json"}
}
```

也支持 wrapper 形式：

```json
{
  "type": "object",
  "properties": {
    "messages": {
      "type": "array",
      "items": {"$ref": "server_to_client.json"}
    }
  },
  "required": ["messages"],
  "additionalProperties": false
}
```

### React 输出：Client to Server

React 组件中的 `Button.action`、输入校验错误、表达式错误等最终会经 `SurfaceModel.dispatchAction()` / `dispatchError()` 进入客户端到服务端的输出链路。React renderer 需要支持用户 action 和 client error 这两类输出语义。

```json
{
  "$id": "https://a2ui.org/specification/v0_9/client_to_server.json",
  "type": "object",
  "minProperties": 2,
  "maxProperties": 2,
  "properties": {
    "version": {"const": "v0.9"},
    "action": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "surfaceId": {"type": "string"},
        "sourceComponentId": {"type": "string"},
        "timestamp": {"type": "string", "format": "date-time"},
        "context": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "required": ["name", "surfaceId", "sourceComponentId", "timestamp", "context"]
    },
    "error": {
      "oneOf": [
        {
          "type": "object",
          "title": "Validation Failed Error",
          "properties": {
            "code": {"const": "VALIDATION_FAILED"},
            "surfaceId": {"type": "string"},
            "path": {"type": "string"},
            "message": {"type": "string"}
          },
          "required": ["code", "path", "message", "surfaceId"],
          "additionalProperties": false
        },
        {
          "type": "object",
          "title": "Generic Error",
          "properties": {
            "code": {"not": {"const": "VALIDATION_FAILED"}},
            "surfaceId": {"type": "string"},
            "message": {"type": "string"}
          },
          "required": ["code", "surfaceId", "message"],
          "additionalProperties": true
        }
      ]
    }
  },
  "oneOf": [
    {"required": ["action", "version"]},
    {"required": ["error", "version"]}
  ]
}
```

传输层如果按批量消息发送，则同样可以使用 list 和 wrapper 形式。React renderer 本身通常只产生单个 action/error 事件，由外层 transport 决定是否包装为数组。

```json
{
  "type": "array",
  "items": {"$ref": "client_to_server.json"}
}
```

```json
{
  "type": "object",
  "properties": {
    "messages": {
      "type": "array",
      "items": {"$ref": "client_to_server.json"}
    }
  },
  "required": ["messages"],
  "additionalProperties": false
}
```

### React 能力上报：Client Capabilities

React renderer 配合 `web_core` 需要生成 `a2uiClientCapabilities`，至少声明 v0.9 支持的 catalog id。官方 React basic renderer 至少应声明：

```json
{
  "v0.9": {
    "supportedCatalogIds": [
      "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
    ]
  }
}
```

若服务端接受 inline catalogs，可以附带 React renderer 当前注册 catalog 的完整组件和函数 schema。

```json
{
  "$id": "https://a2ui.org/specification/v0_9/client_capabilities.json",
  "type": "object",
  "properties": {
    "v0.9": {
      "type": "object",
      "properties": {
        "supportedCatalogIds": {
          "type": "array",
          "items": {"type": "string"}
        },
        "inlineCatalogs": {
          "type": "array",
          "items": {"$ref": "#/$defs/Catalog"}
        }
      },
      "required": ["supportedCatalogIds"]
    }
  },
  "required": ["v0.9"],
  "$defs": {
    "FunctionDefinition": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "description": {"type": "string"},
        "parameters": {"$ref": "https://json-schema.org/draft/2020-12/schema"},
        "returnType": {
          "type": "string",
          "enum": ["string", "number", "boolean", "array", "object", "any", "void"]
        }
      },
      "required": ["name", "parameters", "returnType"],
      "additionalProperties": false
    },
    "Catalog": {
      "type": "object",
      "properties": {
        "catalogId": {"type": "string"},
        "components": {
          "type": "object",
          "additionalProperties": {"$ref": "https://json-schema.org/draft/2020-12/schema"}
        },
        "functions": {
          "type": "array",
          "items": {"$ref": "#/$defs/FunctionDefinition"}
        },
        "theme": {
          "type": "object",
          "additionalProperties": {"$ref": "https://json-schema.org/draft/2020-12/schema"}
        }
      },
      "required": ["catalogId"],
      "additionalProperties": false
    }
  }
}
```

### React 数据回传：Client Data Model

如果 React renderer 正在渲染的某个 surface 由 `createSurface.sendDataModel: true` 创建，客户端发送 action 时要能按此 schema 附带当前数据模型。实际聚合逻辑由 `MessageProcessor.getClientDataModel()` 提供。

```json
{
  "$id": "https://a2ui.org/specification/v0_9/client_data_model.json",
  "type": "object",
  "properties": {
    "version": {"const": "v0.9"},
    "surfaces": {
      "type": "object",
      "additionalProperties": {
        "type": "object"
      }
    }
  },
  "required": ["version", "surfaces"],
  "additionalProperties": false
}
```

### React 绑定基础：Common Types

React renderer 的 `GenericBinder` 正是围绕这些通用类型工作的。渲染器不一定要以 JSON Schema 的形式直接运行它们，但行为必须等价。

```json
{
  "$id": "https://a2ui.org/specification/v0_9/common_types.json",
  "$defs": {
    "ComponentId": {
      "type": "string"
    },
    "AccessibilityAttributes": {
      "type": "object",
      "properties": {
        "label": {"$ref": "#/$defs/DynamicString"},
        "description": {"$ref": "#/$defs/DynamicString"}
      }
    },
    "ComponentCommon": {
      "type": "object",
      "properties": {
        "id": {"$ref": "#/$defs/ComponentId"},
        "accessibility": {"$ref": "#/$defs/AccessibilityAttributes"}
      },
      "required": ["id"]
    },
    "ChildList": {
      "oneOf": [
        {
          "type": "array",
          "items": {"$ref": "#/$defs/ComponentId"}
        },
        {
          "type": "object",
          "properties": {
            "componentId": {"$ref": "#/$defs/ComponentId"},
            "path": {"type": "string"}
          },
          "required": ["componentId", "path"],
          "additionalProperties": false
        }
      ]
    },
    "DataBinding": {
      "type": "object",
      "properties": {
        "path": {"type": "string"}
      },
      "required": ["path"],
      "additionalProperties": false
    },
    "DynamicValue": {
      "oneOf": [
        {"type": "string"},
        {"type": "number"},
        {"type": "boolean"},
        {"type": "array"},
        {"$ref": "#/$defs/DataBinding"},
        {"$ref": "#/$defs/FunctionCall"}
      ]
    },
    "DynamicString": {
      "oneOf": [
        {"type": "string"},
        {"$ref": "#/$defs/DataBinding"},
        {
          "allOf": [
            {"$ref": "#/$defs/FunctionCall"},
            {"properties": {"returnType": {"const": "string"}}}
          ]
        }
      ]
    },
    "DynamicNumber": {
      "oneOf": [
        {"type": "number"},
        {"$ref": "#/$defs/DataBinding"},
        {
          "allOf": [
            {"$ref": "#/$defs/FunctionCall"},
            {"properties": {"returnType": {"const": "number"}}}
          ]
        }
      ]
    },
    "DynamicBoolean": {
      "oneOf": [
        {"type": "boolean"},
        {"$ref": "#/$defs/DataBinding"},
        {
          "allOf": [
            {"$ref": "#/$defs/FunctionCall"},
            {"properties": {"returnType": {"const": "boolean"}}}
          ]
        }
      ]
    },
    "DynamicStringList": {
      "oneOf": [
        {"type": "array", "items": {"type": "string"}},
        {"$ref": "#/$defs/DataBinding"},
        {
          "allOf": [
            {"$ref": "#/$defs/FunctionCall"},
            {"properties": {"returnType": {"const": "array"}}}
          ]
        }
      ]
    },
    "FunctionCall": {
      "type": "object",
      "properties": {
        "call": {"type": "string"},
        "args": {
          "type": "object",
          "additionalProperties": {
            "anyOf": [
              {"$ref": "#/$defs/DynamicValue"},
              {"type": "object"}
            ]
          }
        },
        "returnType": {
          "type": "string",
          "enum": ["string", "number", "boolean", "array", "object", "any", "void"],
          "default": "boolean"
        }
      },
      "required": ["call"],
      "oneOf": [{"$ref": "catalog.json#/$defs/anyFunction"}]
    },
    "CheckRule": {
      "type": "object",
      "properties": {
        "condition": {"$ref": "#/$defs/DynamicBoolean"},
        "message": {"type": "string"}
      },
      "required": ["condition", "message"],
      "additionalProperties": false
    },
    "Checkable": {
      "type": "object",
      "properties": {
        "checks": {
          "type": "array",
          "items": {"$ref": "#/$defs/CheckRule"}
        }
      }
    },
    "Action": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "event": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "context": {
                  "type": "object",
                  "additionalProperties": {"$ref": "#/$defs/DynamicValue"}
                }
              },
              "required": ["name"],
              "additionalProperties": false
            }
          },
          "required": ["event"],
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "functionCall": {"$ref": "#/$defs/FunctionCall"}
          },
          "required": ["functionCall"],
          "additionalProperties": false
        }
      ]
    }
  }
}
```

实现层要特别处理这些通用类型：

- `DataBinding.path` 支持绝对路径和相对路径。
- `Dynamic*` 可以是字面量、路径绑定或函数调用。
- `ChildList` 可以是固定组件 id 列表，也可以是基于 data model 数组的模板。
- `Action.event.context` 必须在派发前解析动态值。
- `Action.functionCall` 是本地函数调用，不一定要发送到服务端。
- `Checkable.checks` 要生成响应式校验状态。

### React 内置目录：Basic Catalog Schema

官方 React renderer 内置的是 basic catalog 的 React 实现。完整 schema 在 `D:\Code\a2ui\specification\v0_9\catalogs\basic\catalog.json`。React basic renderer 应支持 catalog id：

```json
{
  "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
}
```

组件 envelope 规则是：每个组件都必须包含 `id` 和 `component`，其中 `component` 是组件类型名；组件其余字段由该类型的 schema 决定。概念结构如下：

```json
{
  "$defs": {
    "anyComponent": {
      "oneOf": [
        {"$ref": "#/$defs/components/Text"},
        {"$ref": "#/$defs/components/Image"},
        {"$ref": "#/$defs/components/Icon"},
        {"$ref": "#/$defs/components/Video"},
        {"$ref": "#/$defs/components/AudioPlayer"},
        {"$ref": "#/$defs/components/Row"},
        {"$ref": "#/$defs/components/Column"},
        {"$ref": "#/$defs/components/List"},
        {"$ref": "#/$defs/components/Card"},
        {"$ref": "#/$defs/components/Tabs"},
        {"$ref": "#/$defs/components/Modal"},
        {"$ref": "#/$defs/components/Divider"},
        {"$ref": "#/$defs/components/Button"},
        {"$ref": "#/$defs/components/TextField"},
        {"$ref": "#/$defs/components/CheckBox"},
        {"$ref": "#/$defs/components/ChoicePicker"},
        {"$ref": "#/$defs/components/Slider"},
        {"$ref": "#/$defs/components/DateTimeInput"}
      ]
    }
  }
}
```

Basic catalog 组件字段支持清单：

| Component | 必须支持的协议字段 |
| --- | --- |
| `Text` | `id`, `component`, `text: DynamicString`, `variant?`, `weight?`, `accessibility?` |
| `Image` | `id`, `component`, `url: DynamicString`, `description?`, `fit?`, `variant?`, `weight?`, `accessibility?` |
| `Icon` | `id`, `component`, `name`, `weight?`, `accessibility?` |
| `Video` | `id`, `component`, `url: DynamicString`, `weight?`, `accessibility?` |
| `AudioPlayer` | `id`, `component`, `url: DynamicString`, `description?`, `weight?`, `accessibility?` |
| `Row` | `id`, `component`, `children: ChildList`, `justify?`, `align?`, `weight?`, `accessibility?` |
| `Column` | `id`, `component`, `children: ChildList`, `justify?`, `align?`, `weight?`, `accessibility?` |
| `List` | `id`, `component`, `children: ChildList`, `direction?`, `align?`, `listStyle?`, `weight?`, `accessibility?` |
| `Card` | `id`, `component`, `child: ComponentId`, `weight?`, `accessibility?` |
| `Tabs` | `id`, `component`, `tabs: [{ title: DynamicString, child: ComponentId }]`, `weight?`, `accessibility?` |
| `Modal` | `id`, `component`, `trigger: ComponentId`, `content: ComponentId`, `weight?`, `accessibility?` |
| `Divider` | `id`, `component`, `axis?`, `weight?`, `accessibility?` |
| `Button` | `id`, `component`, `child: ComponentId`, `variant?`, `action: Action`, `checks?`, `weight?`, `accessibility?` |
| `TextField` | `id`, `component`, `label: DynamicString`, `value?: DynamicString`, `variant?`, `validationRegexp?`, `checks?`, `weight?`, `accessibility?` |
| `CheckBox` | `id`, `component`, `label: DynamicString`, `value: DynamicBoolean`, `checks?`, `weight?`, `accessibility?` |
| `ChoicePicker` | `id`, `component`, `label?`, `variant?`, `options`, `value: DynamicStringList`, `displayStyle?`, `filterable?`, `checks?`, `weight?`, `accessibility?` |
| `Slider` | `id`, `component`, `label?`, `min?`, `max`, `step?`, `value: DynamicNumber`, `checks?`, `weight?`, `accessibility?` |
| `DateTimeInput` | `id`, `component`, `value: DynamicString`, `enableDate?`, `enableTime?`, `min?`, `max?`, `label?`, `checks?`, `weight?`, `accessibility?` |

实现时建议直接以官方 `catalog.json` 或 `web_core/src/v0_9/basic_catalog/components/basic_components.ts` 作为单一事实来源，避免手写字段和官方 schema 漂移。React 当前 basic catalog 的组件实现对应 `renderers/react/src/v0_9/catalog/basic/components/*`。
