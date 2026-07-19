# Renderer Basic Catalog 能力矩阵

## 1. 定位

本文档记录 `packages/renderer` 对 A2UI v0.9 Basic Catalog 的当前实际渲染能力，是 Renderer 组件实现状态的权威说明。

本文档只描述 Renderer 已实现的行为，不定义 A2UI 协议合法性。协议字段、校验约束和 Agent 可输出字段以 [A2UI v0.9 契约](../03-contracts/a2ui-v0.9.md) 为准。

## 2. 与其他文档的关系

- [A2UI v0.9 契约](../03-contracts/a2ui-v0.9.md)：定义消息结构、组件树规则、Basic Catalog 字段合法性和校验约束。
- [Renderer 模块说明](./renderer.md)：定义 Renderer 模块边界、工程结构、核心流程和维护规则。
- 本文档：定义 Renderer 对 Basic Catalog 字段的实际消费能力、已知缺口和测试验收范围。

当三者描述同一事实时，按以下规则解释：

- 字段是否合法：看 A2UI 契约和 Agent schema。
- 字段是否已被当前 Renderer 渲染：看本文档。
- 字段由哪个文件实现：看 Renderer 模块说明和源码路径。

## 3. 当前支持的 A2UI 信息与对应功能

当前 `packages/renderer` 可以消费的 A2UI 信息分为消息层、Surface 层、组件层、数据层和交互回传层。

### 3.1 服务端消息

Renderer 只接受 `version === "v0.9"` 的服务端消息。已支持的消息如下：

| A2UI 信息 | 当前功能 | 实现说明 |
| --- | --- | --- |
| `createSurface` | 创建或更新一个 `SurfaceModel`，记录 `surfaceId`、`catalogId`，并接收可选 `theme`、`sendDataModel`。 | `theme` 和 `sendDataModel` 当前只进入 surface 状态，尚未形成完整主题渲染或 dataModel 自动回传链路。 |
| `updateDataModel` | 按 JSON Pointer 路径写入数据，支持替换根数据、写入对象路径和数组下标路径。 | `path` 为空、未提供或为 `/` 时替换整个 dataModel；深层路径会自动创建中间对象或数组。 |
| `updateComponents` | 增量更新组件集合，新增、更新或删除 surface 内的组件，并触发 Vue 响应式渲染。 | 组件 `id` 不变且 `component` 类型不变时更新属性；类型变化时重建组件模型。 |
| `deleteSurface` | 删除指定 surface，清理组件集合和 dataModel 订阅。 | 删除后对应 `A2uiSurface` 会显示 surface 缺失状态。 |

消息处理结果会返回本次接受的消息数和涉及的 `surfaceIds`。目标 surface 不存在的 `updateComponents`、`updateDataModel` 会被忽略并记录 warning。

### 3.2 Surface 与组件树

Renderer 当前按以下规则渲染 A2UI surface：

- 每个 surface 由 `A2uiSurface.vue` 承载，必须存在 `id: "root"` 的根组件才会进入正常渲染。
- 单个组件由 `A2uiComponent.vue` 动态渲染，根据 `component` 字段从 `catalogRegistry` 查找 Vue 组件。
- 未找到组件实例时显示“组件未找到”，组件类型未注册时显示“未注册的组件类型”。
- 已注册 Basic Catalog 的 18 个组件：`Text`、`Image`、`Icon`、`Video`、`AudioPlayer`、`Divider`、`Row`、`Column`、`List`、`Card`、`Tabs`、`Modal`、`Button`、`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`。
- 容器组件主要通过 `child` 或 `children` 引用其他组件 ID，不支持在 props 内直接内联嵌套组件对象。

### 3.3 数据模型与动态取值

Renderer 当前支持基于 JSON Pointer 的数据模型能力：

| A2UI 信息 | 当前功能 | 典型用途 |
| --- | --- | --- |
| `updateDataModel.path` + `value` | 写入或替换数据模型中的指定路径。 | 初始化表单值、列表数据、状态值。 |
| `{ "path": "/some/value" }` 动态引用 | 组件属性中只有 `path` 一个字段的对象会被解析为 dataModel 取值。 | `Text.text`、`Image.url`、`Button.action.context`、表单 `value/text` 等动态绑定。 |
| 相对路径上下文 | `DataContext` 支持绝对路径和相对路径拼接。 | 为后续动态列表模板扩展保留基础能力。 |
| 表单类组件写回 | 部分输入组件在绑定值为 `{ path }` 时，会把用户输入写回 dataModel。 | `TextField.text`、`CheckBox.value`、`ChoicePicker.value`、`Slider.value`、`DateTimeInput.value`。 |

注意：当前 `List` 能根据 `{ path, componentId }` 读取数组并重复渲染模板组件，但尚未为每一项创建独立 item 作用域，因此模板内直接读取当前项字段的能力仍不完整。

### 3.4 可实现的 UI 功能

基于当前 Basic Catalog 组件和数据能力，Renderer 已能实现以下 UI：

| 功能类型 | 可实现能力 | 主要组件 |
| --- | --- | --- |
| 文本展示 | 标题、正文、说明文字、单行或多行截断、动态文本绑定。 | `Text` |
| 图片和媒体展示 | 图片 URL、替代文本、裁剪方式、宽高比例、浏览器原生懒加载；基础视频和音频播放控件。 | `Image`、`Video`、`AudioPlayer` |
| 图标展示 | 常用图标名到 Unicode/emoji fallback 的展示，未知图标名直接显示名称文本。 | `Icon` |
| 基础布局 | 水平/垂直 flex 布局、间距、换行、对齐、分布、卡片包裹、静态列表、基础标签页、基础模态框。 | `Row`、`Column`、`Card`、`List`、`Tabs`、`Modal`、`Divider` |
| 表单输入 | 文本输入、长文本、数字输入、密码输入、复选框、下拉选择、滑块、日期/时间/日期时间输入，并可写回 dataModel。 | `TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput` |
| 用户操作 | 按钮点击后派发 `a2ui:action` 浏览器事件，携带 `name`、`surfaceId`、`sourceComponentId`、`timestamp`、`context`。 | `Button` |
| 视觉样式 | 受控 `style` 白名单、`variant`、`size`、`tone`、`preset` 修饰类，形成按钮、卡片、文本、布局等基础视觉变化。 | 已接入 `visual-props.ts` 的组件 |

### 3.5 客户端回传能力

当前已实现的客户端到宿主环境回传能力：

- `Button` 点击会调用 `dispatchAction`，在 `window` 上派发 `CustomEvent("a2ui:action")`。
- 回传 detail 结构包含 `name`、`surfaceId`、`sourceComponentId`、`timestamp` 和 `context`。
- `context` 内的 `{ path }` 动态引用会在点击时解析成当前 dataModel 值。
- 当前按钮 action 解析仍兼容历史扁平格式 `{ name, context }`；契约目标格式 `action.event` 尚未在 Renderer 中完全对齐。
- `action.functionCall` 当前不执行。

### 3.6 当前不支持或仅保留状态的信息

以下 A2UI 信息即使能通过上游校验，也不代表当前 Renderer 已完整消费：

- `createSurface.theme`：仅保存到 `SurfaceModel.theme`，尚未驱动全局主题变量。
- `createSurface.sendDataModel`：仅保存布尔状态，尚未自动在 action 中附带完整 dataModel 快照。
- 任意 `className`、`css`、`innerHTML`、脚本、事件处理器字段：Renderer 不消费。
- 未注册组件类型：不会执行动态代码，只显示 fallback。
- `action.event` 目标结构、`action.functionCall`、复杂 Modal 触发策略、完整表单校验展示、真实图标库、媒体 poster/autoplay/loop/muted 等字段仍待补齐。

## 4. 通用视觉属性

Renderer 已提供通用视觉属性解析工具：`packages/renderer/src/components/basic/visual-props.ts`。

已支持的通用字段：

| 字段 | 当前行为 |
| --- | --- |
| `style` | 解析受控白名单字段并绑定为 Vue `style`。 |
| `variant` | 转换为 `a2ui-<component>--variant-<value>` 修饰类。 |
| `size` | 转换为 `a2ui-<component>--size-<value>` 修饰类。 |
| `tone` | 转换为 `a2ui-<component>--tone-<value>` 修饰类。 |
| `preset` | 转换为 `a2ui-<component>--preset-<value>` 修饰类。 |

`style` 当前支持的白名单字段：

- 尺寸：`width`、`height`、`minWidth`、`maxWidth`、`minHeight`、`maxHeight`
- 间距：`padding`、`paddingX`、`paddingY`、`margin`、`marginX`、`marginY`、`gap`
- 颜色与边框：`color`、`backgroundColor`、`borderColor`、`borderWidth`、`borderRadius`
- 文字：`fontSize`、`fontWeight`、`lineHeight`、`textAlign`
- 对齐：`alignSelf`、`justifySelf`
- 效果：`shadow`、`opacity`

安全约束：

- Renderer 不消费 `className`、`css`、`innerHTML`、脚本或事件处理器字段。
- `style` 只做白名单字段转换，不透传任意 CSS 块。
- `variant`、`size`、`tone`、`preset` 只生成 Renderer 自有修饰类，具体视觉由 `packages/renderer/src/styles.css` 决定。

## 5. 组件能力总览

| 组件 | 当前状态 | 已消费字段 | 主要缺口 |
| --- | --- | --- | --- |
| `Text` | 部分完整 | `text`、`usageHint`、`maxLines`、通用视觉字段 | `variant/preset` 只有部分默认样式。 |
| `Image` | 部分完整 | `url`、`alt`、`fit`、`aspectRatio`、`loading`、通用视觉字段 | 未实现错误占位、加载占位。 |
| `Icon` | 部分完整 | `name`、兼容 `icon`、通用视觉字段 | 图标库仍为 Unicode fallback，不是真实 Material/Lucide 图标集。 |
| `Video` | 基础 | `url` | `poster`、`autoplay`、`loop`、`muted`、`fit`、`aspectRatio`、通用视觉字段尚未接入。 |
| `AudioPlayer` | 基础 | `url` | `autoplay`、`loop`、`muted`、`density`、通用视觉字段尚未接入。 |
| `Divider` | 基础 | 无额外字段 | `orientation`、`thickness`、`color`、`spacing`、`label`、通用视觉字段尚未接入。 |
| `Row` | 部分完整 | `children`、`distribution`、`alignment`、`gap`、`wrap`、通用视觉字段 | 未实现 grid/form 等复杂预设的专门布局。 |
| `Column` | 部分完整 | `children`、`distribution`、`alignment`、`gap`、`wrap`、通用视觉字段 | 未实现 grid/form 等复杂预设的专门布局。 |
| `List` | 基础 | 静态 `children`、动态 `{ path, componentId }` | `direction`、`marker`、`gap`、`divided`、`wrap`、通用视觉字段尚未接入。 |
| `Card` | 部分完整 | `child`、兼容 `children`、`title`、通用视觉字段 | `variant/preset` 只有部分默认样式。 |
| `Tabs` | 基础 | `tabItems`、兼容 `tabs`、本地选中态 | `align`、`fullWidth`、`variant`、`size`、`tone`、通用视觉字段尚未接入。 |
| `Modal` | 基础 | `child`、本地关闭态 | `visible` 绑定、`trigger`、`size`、`placement`、关闭策略、遮罩强度、标题/底部区尚未接入。 |
| `Button` | 部分完整 | `child`、`action`（当前实现仍按历史扁平 `{ name, context }` 解析）、`fullWidth`、`disabled`、`loading`、通用视觉字段 | 需要迁移到契约目标 `action.event`；`action.functionCall` 暂不执行；`iconPosition` 尚未实现；loading 只有禁用语义，未显示加载指示器。 |
| `TextField` | 基础 | `label`、`text`、`usageHint` | `placeholder`、`disabled`、`required`、`helpText`、`errorText`、通用视觉字段尚未接入。 |
| `CheckBox` | 基础 | `label`、`value` | `description`、`labelPosition`、`disabled`、`helpText`、`errorText`、通用视觉字段尚未接入。 |
| `ChoicePicker` | 基础 | `options`、`value` | `label`、`placeholder`、`disabled`、`helpText`、`errorText`、通用视觉字段尚未接入。 |
| `Slider` | 部分完整 | `min`、`max`、`value`、`step`、`showValue`、`valuePrefix`、`valueSuffix`、`disabled`、通用视觉字段 | `label/helpText/errorText` 尚未显示。 |
| `DateTimeInput` | 基础 | `label`、`value`、`usageHint` | `placeholder`、`disabled`、`required`、`helpText`、`errorText`、通用视觉字段尚未接入。 |

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
- `CardComponent.vue`
- `ButtonComponent.vue`
- `SliderComponent.vue`

这些组件会消费通用视觉字段，并由 `styles.css` 提供基础样式、修饰类和部分预设表现。

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
- `packages/renderer/src/components/basic/visual-props.test.ts`

建议后续补充：

- 为尚未接入通用视觉属性的组件逐步补测试。
- 增加包含 18 个组件的 Basic Catalog 样例 surface。
- 增加音乐卡片回归样例，验证图标、图片比例、按钮变体和 Slider 数值隐藏。
- 增加视觉截图验收，防止 CSS 变体回退为默认浏览器控件。

## 9. 后续升级顺序

建议按以下优先级继续补齐：

1. 表单组件：`TextField`、`CheckBox`、`ChoicePicker`、`DateTimeInput`
2. 结构组件：`List`、`Tabs`、`Divider`
3. 媒体组件：`Video`、`AudioPlayer`
4. 复合行为：`Modal.visible`、`Modal.trigger`、关闭策略和布局预设

每次升级都应同步：

- 组件实现
- `styles.css`
- 本文档能力矩阵
- 对应组件测试
- 如新增协议字段，再同步 A2UI 契约和 Agent schema
