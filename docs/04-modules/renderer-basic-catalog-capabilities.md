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

## 3. 通用视觉属性

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

## 4. 组件能力总览

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

## 5. 已接入受控视觉属性的组件

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

## 6. 当前音乐卡片场景支持情况

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

## 7. 测试与验收

当前已覆盖：

- `packages/renderer/src/core/surface-model.test.ts`
- `packages/renderer/src/components/basic/visual-props.test.ts`

建议后续补充：

- 为尚未接入通用视觉属性的组件逐步补测试。
- 增加包含 18 个组件的 Basic Catalog 样例 surface。
- 增加音乐卡片回归样例，验证图标、图片比例、按钮变体和 Slider 数值隐藏。
- 增加视觉截图验收，防止 CSS 变体回退为默认浏览器控件。

## 8. 后续升级顺序

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
