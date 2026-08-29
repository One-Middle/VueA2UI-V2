# Renderer Basic Catalog 能力矩阵

## 1. 定位

本文档记录 `packages/renderer` 对 A2UI v0.9 Basic Catalog 的当前实际渲染能力，是 Renderer 组件实现状态的权威说明。

本文档只描述 Renderer 已实现的行为，不定义 A2UI 协议合法性。协议字段、校验约束和 Agent 可输出字段以 [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md) 为准。

## 2. 与其他文档的关系

- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)：定义消息结构、组件树规则、Basic Catalog 字段合法性和校验约束。
- [Renderer 模块说明](./README.md)：定义 Renderer 模块边界、工程结构、核心流程和维护规则。
- 本文档：定义 Renderer 对 Basic Catalog 字段的实际消费能力、已知缺口和测试验收范围。

当三者描述同一事实时，按以下规则解释：

- 字段是否合法：看 A2UI 契约和 Agent schema。
- 字段是否已被当前 Renderer 渲染：看本文档。
- 字段由哪个文件实现：看 Renderer 模块说明和源码路径。

## 3. 当前支持的 A2UI 信息与对应功能

当前 `packages/renderer` 可以消费的 A2UI 信息分为消息层、Surface 层、组件层、数据层和交互回传层。

### 3.1 服务端消息

Renderer 只接受 `version === "v0.9"` 的服务端消息。已支持的消息如下：

| A2UI 信息          | 当前功能                                                                     | 实现说明                                                                             |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `createSurface`    | 创建或更新一个 `SurfaceModel`，记录 `surfaceId`、`catalogId`。               | 当前只声明 surface 与 Catalog 的绑定关系。                                           |
| `updateDataModel`  | 按 JSON Pointer 路径写入数据，支持替换根数据、写入对象路径和数组下标路径。   | `path` 为空、未提供或为 `/` 时替换整个 dataModel；深层路径会自动创建中间对象或数组。 |
| `updateComponents` | 增量更新组件集合，新增、更新或删除 surface 内的组件，并触发 Vue 响应式渲染。 | 组件 `id` 不变且 `component` 类型不变时更新属性；类型变化时重建组件模型。            |
| `deleteSurface`    | 删除指定 surface，清理组件集合和 dataModel 订阅。                            | 删除后对应 `A2uiSurface` 会显示 surface 缺失状态。                                   |

消息处理结果会返回本次接受的消息数和涉及的 `surfaceIds`。目标 surface 不存在的 `updateComponents`、`updateDataModel` 会被忽略并记录 warning。

### 3.2 Surface 与组件树

Renderer 当前按以下规则渲染 A2UI surface：

- 每个 surface 由 `A2uiSurface.vue` 承载，必须存在 `id: "root"` 的根组件才会进入正常渲染。
- 单个组件先由 RenderNode builder 解析 A2UI 字段语义，再由 `renderVueNode` 映射到 `src/ui/basic` 普通 Vue 组件。
- 未找到组件实例时显示“组件未找到”，组件类型未注册时显示“未注册的组件类型”。
- 正式 Basic Catalog 的 20 个组件：`Text`、`Image`、`Icon`、`Video`、`AudioPlayer`、`Divider`、`Row`、`Column`、`Grid`、`Container`、`Spacer`、`List`、`Card`、`Tabs`、`Button`、`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`。
- `Modal` 不属于新正式 Basic Catalog；legacy 源文件保留但新 Renderer 链路不依赖它。
- 容器组件主要通过 `child` 或 `children` 引用其他组件 ID，不支持在 props 内直接内联嵌套组件对象。

### 3.3 数据模型与动态取值

Renderer 当前支持基于 JSON Pointer 的数据模型能力：

| A2UI 信息                                               | 当前功能                                                                                                                                                                                                                                           | 典型用途                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `updateDataModel.path` + `value`                        | 写入或替换数据模型中的指定路径。                                                                                                                                                                                                                   | 初始化表单值、列表数据、状态值。                                                                  |
| `{ "path": "/some/value" }` 动态引用                    | 组件属性中只有 `path` 一个字段的对象会被解析为 dataModel 取值，根替换和深层路径更新都会触发 Vue 响应式刷新；路径由当前 `DataContext` 解析，支持绝对路径和相对路径。                                                                                | `Text.text`、`Image.url`、`Button.action.context`、表单 `value/text` 等动态绑定。                 |
| `{ "script": { "code", "deps", "fallback" } }` 属性脚本 | 组件属性可通过 JSRuntime 只读访问 `dataModel.get` 并返回 JSON-compatible 值；默认执行路径为 `new Function` + AST guard，SES `Compartment` 路径可配置切换；`deps` 变化会触发重新执行；`deps` 和 `dataModel.get(path)` 都按当前 `DataContext` 解析。 | `Text.text`、已接入通用视觉属性的 `style.<白名单字段>`。                                          |
| 相对路径上下文                                          | `DataContext` 支持绝对路径和相对路径拼接，递归渲染时会向子组件传递当前 dataModel 作用域。                                                                                                                                                          | 动态列表模板、嵌套容器内的相对路径绑定。                                                          |
| 表单类组件写回                                          | 部分输入组件在绑定值为 `{ path }` 时，会把用户输入写回 dataModel。                                                                                                                                                                                 | `TextField.text`、`CheckBox.value`、`ChoicePicker.value`、`Slider.value`、`DateTimeInput.value`。 |

注意：当前 `List` 能根据 `{ path, componentId }` 读取数组并重复渲染模板组件，并会为每一项创建独立 item 作用域，因此模板组件内可以使用相对 `{ path: "title" }`、`dataModel.get("done")` 和 `deps: ["done"]` 读取当前项字段。

### 3.4 可实现的 UI 功能

基于当前 Basic Catalog 组件和数据能力，Renderer 已能实现以下 UI：

| 功能类型       | 可实现能力                                                                                                                                                            | 主要组件                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 文本展示       | 标题、正文、说明文字、单行或多行截断、动态文本绑定。                                                                                                                  | `Text`                                                                            |
| 图片和媒体展示 | 图片 URL、替代文本、裁剪方式、宽高比例、浏览器原生懒加载；基础视频和音频播放控件。                                                                                    | `Image`、`Video`、`AudioPlayer`                                                   |
| 图标展示       | 常用图标名到 Unicode/emoji fallback 的展示，未知图标名直接显示名称文本。                                                                                              | `Icon`                                                                            |
| 基础布局       | 水平/垂直 flex 布局、二维栅格、页面容器、受控空隙、间距、换行、对齐、分布、卡片包裹、静态列表和基础标签页。                                                           | `Row`、`Column`、`Grid`、`Container`、`Spacer`、`Card`、`List`、`Tabs`、`Divider` |
| 表单输入       | 文本输入、长文本、数字输入、密码输入、复选框、下拉选择、滑块、日期/时间/日期时间输入，并可写回 dataModel。                                                            | `TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`                |
| 用户操作       | 按钮点击后派发 `a2ui:action` 浏览器事件，事件 detail 为标准 A2UI client message，包含 `version` 和 `action`；`action.script` 可通过注入的 `actions.emit` 复用该链路。 | `Button`                                                                          |
| 视觉样式       | 受控 `style` 白名单、`variant`、`size`、`tone`、`preset` 修饰类，形成按钮、卡片、文本、布局等基础视觉变化。                                                           | 已接入 `visual-props.ts` 的组件                                                   |

### 3.5 支持的 action 类型与实现原理

当前 Renderer 只有 `Button` 会消费组件声明中的 `action` 字段。action 解析由 `packages/renderer/src/core/action.ts` 和 `packages/renderer/src/render/resolve-action-bindings.ts` 负责，点击派发由 `packages/renderer/src/render/vue-renderer.ts` 转成普通 Vue `click` handler 完成。

| action 声明类型                                 | 示例                                                                                                                                                                                                   | 当前行为                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正式事件 action：`action.event`                 | `{ "action": { "event": { "name": "submit", "context": { "form": { "path": "/form" } } } } }`                                                                                                          | 支持。点击按钮时解析为 `kind: "event"`，读取 `event.name`，解析 `event.context` 后派发标准 A2UI action 消息。                                                                                                                                                                 |
| 受限脚本 action：`action.script`                | `{ "action": { "script": { "code": "const count = Number(dataModel.get('/count') ?? 0); dataModel.set('/count', count + 1); actions.emit('changed', { count: count + 1 });", "deps": ["/count"] } } }` | 支持。点击按钮时通过 JSRuntime 同步执行脚本，可读写当前 surface 的 `dataModel`，并通过 `actions.emit` 派发标准 A2UI action 消息。`dataModel.get/set(path)` 支持当前 `DataContext` 下的相对路径。默认执行路径为 `new Function` + AST guard，SES `Compartment` 路径可配置切换。 |
| 未来函数调用 action：`action.functionCall`      | `{ "action": { "functionCall": { "call": "openUrl", "args": { "url": "https://a2ui.org" } } } }`                                                                                                       | 只识别，不执行。`Button` 点击时会忽略 `kind: "functionCall"`，不会派发 `a2ui:action`，也不会调用浏览器或后端能力。                                                                                                                                                            |
| 空 action、非对象 action、缺少有效名称的 action | `{ "action": {} }`                                                                                                                                                                                     | 不派发。                                                                                                                                                                                                                                                                      |

实现链路：

1. RenderNode builder 根据 Catalog 字段语义读取 `Button.action`，并调用 `resolveActionBindings`。
2. `resolveActionBindings` 会通过 `resolveComponentAction(rawAction, resolveValue)` 解析 action 本身的 `{ path }` 动态引用，再按顺序识别 `action.event`、`action.script` 和 `action.functionCall`。
3. 点击按钮时，如果按钮处于 `disabled` 或 `loading` 状态，直接中止，不派发 action。
4. 解析结果为 `kind: "event"` 时直接派发；解析结果为 `kind: "script"` 时执行受限脚本；`functionCall` 当前被明确跳过。
5. `resolveActionContext` 会逐项解析 `context` 中的 `{ path }` 动态引用，得到点击时刻的 dataModel 值；解析结果为 `undefined` 的字段会被丢弃。
6. `A2uiSurface.vue` 通过 `createActionMessage` 组装标准回传消息，并在 `window` 上派发 `CustomEvent("a2ui:action")`。`action.script` 中的 `actions.emit` 也复用该派发能力。

派发出的事件 detail 结构为：

```json
{
  "version": "v0.9",
  "action": {
    "kind": "event",
    "name": "submit",
    "surfaceId": "main",
    "sourceComponentId": "submitButton",
    "timestamp": "2026-07-12T00:00:00.000Z",
    "context": {}
  }
}
```

宿主前端负责监听 `a2ui:action` 并决定后续业务处理；Renderer 不直接调用后端 API，不执行 `functionCall`，也不在组件内部决定业务分支。`action.script` 仅能使用 Renderer 显式注入的 `dataModel` 和 `actions` 能力，其中 `dataModel` 路径会按当前组件 `DataContext` 解析。

### 3.6 属性脚本与样式脚本

Renderer 支持只读属性脚本：

```json
{
  "text": {
    "script": {
      "code": "return `当前分数：${dataModel.get('/score') ?? 0}`;",
      "deps": ["/score"],
      "fallback": "当前分数：0"
    }
  }
}
```

当前规则：

- 属性脚本使用 JSRuntime 同步执行；当前默认路径为 `new Function` + AST guard，SES `Compartment` 路径可配置切换。
- 属性脚本只注入 `dataModel.get`，不注入 `dataModel.set`、`actions`、DOM、网络或浏览器存储能力。
- `new Function` 路径会将常见浏览器全局变量替换为 `undefined`，并通过 AST guard 拒绝 `window`、`document`、`globalThis`、`fetch`、`Function`、`eval`、`constructor`、`prototype`、`__proto__`、动态成员访问等高风险入口。
- `deps` 必填，Renderer 会先按当前 `DataContext` 把相对或绝对路径规整为绝对 JSON Pointer，再通过 `DataModel.subscribe` 建立最小订阅，依赖变化后触发组件属性重新计算。
- 属性脚本中的 `dataModel.get(path)` 与 `deps` 使用同一套路径规则；List item 内 `dataModel.get("done")` 会读取当前 item 的 `done`。
- 属性脚本必须显式 `return` JSON-compatible 值；异常时使用 `fallback` 并派发 `a2ui:error`。
- 样式脚本第一版只支持 `style.<白名单字段>.script`，解析结果仍经过 `visual-props.ts` 白名单。

### 3.7 当前不支持的信息

以下信息不属于当前正式能力，Agent 不应生成：

- 任意 `className`、`css`、`innerHTML`、非受控脚本、事件处理器字段：Renderer 不消费。
- 未注册组件类型：不会执行动态代码，只显示 fallback。
- 历史扁平 action：`{ "action": { "name": "submit", "context": {} } }` 不再兼容，按钮点击时不会派发。
- `action.functionCall` 执行能力、`style.script` 整体对象、Worker 超时隔离、完整表单校验展示和真实图标库等能力仍待补齐。

## 4. 通用视觉属性

Renderer 新链路已提供通用视觉属性解析工具：`packages/renderer/src/render/resolve-style.ts`。legacy 组件仍保留 `packages/renderer/src/components/basic/visual-props.ts`。

已支持的通用字段：

| 字段      | 当前行为                                            |
| --------- | --------------------------------------------------- |
| `style`   | 解析受控白名单字段并绑定为 Vue `style`。            |
| `variant` | 转换为 `a2ui-<component>--variant-<value>` 修饰类。 |
| `size`    | 转换为 `a2ui-<component>--size-<value>` 修饰类。    |
| `tone`    | 转换为 `a2ui-<component>--tone-<value>` 修饰类。    |
| `preset`  | 转换为 `a2ui-<component>--preset-<value>` 修饰类。  |

`style` 当前支持的白名单字段：

- 尺寸：`width`、`height`、`minWidth`、`maxWidth`、`minHeight`、`maxHeight`
- 间距：`padding`、`paddingX`、`paddingY`、`margin`、`marginX`、`marginY`、`gap`
- 颜色与边框：`color`、`backgroundColor`、`borderColor`、`borderWidth`、`borderRadius`
- 文字：`fontSize`、`fontWeight`、`lineHeight`、`textAlign`
- 对齐：`alignSelf`、`justifySelf`
- 效果：`shadow`、`opacity`

安全约束：

- Renderer 不消费 `className`、`css`、`innerHTML`、非受控脚本或事件处理器字段。
- `style` 只做白名单字段转换，不透传任意 CSS 块。
- `variant`、`size`、`tone`、`preset` 只生成 Renderer 自有修饰类，具体视觉由 `packages/renderer/src/styles.css` 决定。

## 5. 组件能力总览

| 组件            | 当前状态 | 已消费字段                                                                                                                                                              | 主要缺口                                                                                                                      |
| --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Text`          | 部分完整 | `text`、`usageHint`、`maxLines`、通用视觉字段                                                                                                                           | `variant/preset` 只有部分默认样式。                                                                                           |
| `Image`         | 部分完整 | `url`、`src`、`alt`、`fit`、`aspectRatio`、`loading`、`caption`、`fallbackText`、通用视觉字段                                                                           | 加载占位较基础。                                                                                                              |
| `Icon`          | 部分完整 | `name`、兼容 `icon`、通用视觉字段                                                                                                                                       | 图标库仍为 Unicode fallback，不是真实 Material/Lucide 图标集。                                                                |
| `Video`         | 部分完整 | `url`、`src`、`poster`、`controls`、`autoplay`、`loop`、`muted`、`fit`、`aspectRatio`、通用视觉字段                                                                     | 仍依赖浏览器原生控件。                                                                                                        |
| `AudioPlayer`   | 部分完整 | `url`、`src`、`controls`、`autoplay`、`loop`、`muted`、`density`、通用视觉字段                                                                                          | 仍依赖浏览器原生控件。                                                                                                        |
| `Divider`       | 部分完整 | `orientation`、`thickness`、`color`、`spacing`、`label`、通用视觉字段                                                                                                   | 复杂分隔样式较基础。                                                                                                          |
| `Row`           | 部分完整 | `children`、`distribution`、`alignment`、`gap`、`wrap`、通用视觉字段                                                                                                    | 未实现 grid/form 等复杂预设的专门布局。                                                                                       |
| `Column`        | 部分完整 | `children`、`distribution`、`alignment`、`gap`、`wrap`、通用视觉字段                                                                                                    | 未实现 grid/form 等复杂预设的专门布局。                                                                                       |
| `Grid`          | 部分完整 | `children`（静态）、动态 `{ path, componentId }`、`columns`、`minItemWidth`、`gap`、通用视觉字段                                                                        | 未实现 `variant/preset` 专属栅格样式。                                                                                        |
| `Container`     | 部分完整 | `child`、`width`、`padding`、`align`、通用视觉字段                                                                                                                      | 无动态子项遍历。                                                                                                              |
| `Spacer`        | 基础     | `axis`、`size`、`flex`                                                                                                                                                  | 未接入通用视觉字段。                                                                                                          |
| `List`          | 部分完整 | 静态 `children`、动态 `{ path, componentId }`、动态 item 相对路径作用域、`direction`、`marker`、`gap`、`divided/dividers`、`wrap`、`loading`、`emptyText`、通用视觉字段 | 选择态仍主要是视觉类。                                                                                                        |
| `Card`          | 部分完整 | `child`、兼容 `children`、`title`、通用视觉字段                                                                                                                         | `variant/preset` 只有部分默认样式。                                                                                           |
| `Tabs`          | 基础     | `tabItems`、兼容 `tabs`、本地选中态                                                                                                                                     | `align`、`fullWidth`、`variant`、`size`、`tone`、通用视觉字段尚未接入。                                                       |
| `Button`        | 部分完整 | `child`、`action.event`、`action.script`、识别但不执行 `action.functionCall`、`fullWidth`、`disabled`、`loading`、通用视觉字段                                          | 历史扁平 `action` 不再兼容；`action.functionCall` 暂不执行；`iconPosition` 尚未实现；loading 只有禁用语义，未显示加载指示器。 |
| `TextField`     | 部分完整 | `label`、`text -> modelValue`、`usageHint`、`placeholder`、`disabled`、`required`、`readonly`、`helpText`、`errorText`、通用视觉字段                                    | 原生输入格式限制较基础。                                                                                                      |
| `CheckBox`      | 部分完整 | `label`、`value -> modelValue`、`description`、`labelPosition`、`disabled`、`helpText`、`errorText`、通用视觉字段                                                       | 多选组不在当前组件范围内。                                                                                                    |
| `ChoicePicker`  | 部分完整 | `options`、`value -> modelValue`、`label`、`placeholder`、`disabled`、`helpText`、`errorText`、`mode`、通用视觉字段                                                     | `multiple` 仅保留 props，交互仍是单值。                                                                                       |
| `Slider`        | 部分完整 | `min`、`max`、`value -> modelValue`、`step`、`showValue`、`valuePrefix`、`valueSuffix`、`label`、`disabled`、`helpText`、`errorText`、通用视觉字段                      | marks 展示较基础。                                                                                                            |
| `DateTimeInput` | 部分完整 | `label`、`value -> modelValue`、`usageHint`、`placeholder`、`disabled`、`required`、`helpText`、`errorText`、通用视觉字段                                               | 仍依赖原生 date/time 输入。                                                                                                   |

状态含义：

- 基础：能完成核心渲染或数据绑定，但只消费少量字段。
- 部分完整：已消费主要协议字段和部分视觉字段，但仍有明确缺口。
- 完整：当前暂无组件达到完整状态；完整状态要求 schema 中声明的字段都有明确渲染或明确忽略策略。

## 6. 已接入受控视觉属性的组件

以下组件已经接入 `visual-props.ts`：

- `TextComponent.vue`
- `ImageComponent.vue`
- `IconComponent.vue`
- `RowComponent.vue`
- `ColumnComponent.vue`
- `GridComponent.vue`
- `ContainerComponent.vue`
- `CardComponent.vue`
- `ButtonComponent.vue`
- `SliderComponent.vue`

这些组件会消费通用视觉字段，并由 `styles.css` 提供基础样式、修饰类和部分预设表现。`SpacerComponent.vue` 暂未接入通用视觉字段，只消费 `axis` / `size` / `flex`。

## 7. 当前音乐卡片场景支持情况

针对“类似 QQ 音乐播放风格、带播放控制的音乐卡片”这类组件树，当前 Renderer 已支持：

- `Card.style.maxWidth`、`borderRadius`、`shadow`、`preset=media`
- `Image.fit=cover`、`aspectRatio=1:1`、圆角样式
- `Text.usageHint`、`fontWeight`、`tone`、`maxLines`
- `Row` / `Column` 的 `gap`、`padding`、对齐和分布
- `Button.variant=ghost/primary`、`size=lg`、`preset=buttonIcon`、圆形按钮样式
- `Icon.name=play_arrow/skip_next/skip_previous/favorite_border` 等 fallback 显示
- `Slider.showValue=false`、`step`、进度值绑定

仍不支持或仅基础支持：

- 真正的品牌级图标库。
- 播放器状态驱动的图标自动切换，例如 `isPlaying` 自动切换 `play_arrow` / `pause`。
- 专门的音乐播放器复合组件；当前仍由 Basic Catalog 原子组件组合表达。

## 8. 测试与验收

当前已覆盖：

- `packages/renderer/src/core/surface-model.test.ts`
- `packages/renderer/src/core/data-model.test.ts`
- `packages/renderer/src/core/js-runtime.test.ts`
- `packages/renderer/src/vue/datamodel-reactivity.test.ts`
- `packages/renderer/src/components/basic/visual-props.test.ts`

其中 `visual-props.test.ts` 已覆盖：

- 按正式 `action.event` 派发标准 A2UI action 消息。
- 解析 `action.event.context` 中的 `{ path }` 动态绑定。
- 执行 `action.script`，验证 dataModel 写入和 `actions.emit` 派发。
- 执行 `Text.text.script`，验证 `deps` 变化后的重新计算。
- 执行 `style.<白名单字段>.script`，验证动态样式仍受白名单约束。
- 验证动态 List item 内属性脚本的相对 `dataModel.get`、相对 `deps` 和 `action.script` 相对 `dataModel.get/set`。
- 验证 JSRuntime 默认 `new Function` 路径、AST guard 高风险语法拦截和原型链逃逸入口拦截。
- 确认历史扁平 action 当前不会派发。
- 确认 `action.functionCall` 当前不会执行、不会派发。
- 确认 `TextField.text` 动态绑定可通过 `update:modelValue` 写回 dataModel。
- 确认 `Tabs` 只渲染当前 active panel，并可通过标签切换。

建议后续补充：

- 为普通 UI 组件的视觉属性逐步补截图或 DOM 测试。
- 增加包含 20 个正式组件的 Basic Catalog 样例 surface。
- 增加音乐卡片回归样例，验证图标、图片比例、按钮变体和 Slider 数值隐藏。
- 增加视觉截图验收，防止 CSS 变体回退为默认浏览器控件。

## 9. 后续升级顺序

建议按以下优先级继续补齐：

1. 表单组件：补齐 `ChoicePicker.multiple`、校验状态视觉和辅助文案细节。
2. 结构组件：补齐 `List` 选择态、`Tabs` 受控 active key 和 `Divider` 标签样式。
3. 媒体组件：补齐 `Video`、`AudioPlayer` 的统一加载、错误和密度视觉。
4. 复合行为：补齐 `action.functionCall` 执行策略和更完整的视觉回归。

每次升级都应同步：

- 组件实现
- `styles.css`
- 本文档能力矩阵
- 对应组件测试
- 如新增协议字段，再同步 A2UI 契约和 shared Basic Catalog Definition
