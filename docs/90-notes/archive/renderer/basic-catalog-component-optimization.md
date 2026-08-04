# Basic Catalog 组件能力优化方案

## 1. 背景与目标

当前 Renderer 已实现 A2UI v0.9 Basic Catalog 的 18 个组件，但组件能力主要停留在“能渲染”和“能交互”的 MVP 阶段。多数组件只能读取少量协议字段，视觉表现依赖固定 CSS class，模型无法表达页面层级、视觉重点、控件密度、语义状态和局部样式差异。

本方案的目标是在不允许任意 HTML、JavaScript、CSS 的前提下，扩展 Basic Catalog 的受控样式能力：

- 简单样式由模型直接传入具体值，例如颜色、字号、间距、宽高。
- 复杂样式由组件预定义，通过 `variant`、`size`、`tone`、`preset` 等枚举暴露给模型。
- Renderer 只消费白名单字段，Agent schema 只放行白名单字段，Prompt 只引导模型使用白名单字段。
- 旧 A2UI 消息不传新字段时保持当前默认渲染效果。

## 2. 统一受控样式协议

建议所有 Basic Catalog 组件共享一组通用视觉字段，并由组件按自身语义选择支持范围。

### 2.1 通用字段

| 字段 | 类型 | 用途 | 示例 |
| --- | --- | --- | --- |
| `style` | object | 受控内联样式对象，只允许白名单属性 | `{ "color": "rgb(17,24,39)", "padding": "16px" }` |
| `variant` | string | 组件视觉变体 | `primary`、`secondary`、`outline`、`ghost`、`filled` |
| `size` | string | 组件尺寸密度 | `sm`、`md`、`lg` |
| `tone` | string | 语义色调 | `neutral`、`brand`、`success`、`warning`、`danger` |
| `preset` | string | 复杂组合样式预设 | `hero`、`toolbar`、`metric`、`cardList` |

### 2.2 `style` 白名单

`style` 只能包含下列字段，Renderer 应忽略或拒绝其他字段：

- 尺寸：`width`、`height`、`minWidth`、`maxWidth`、`minHeight`、`maxHeight`
- 间距：`padding`、`paddingX`、`paddingY`、`margin`、`marginX`、`marginY`、`gap`
- 颜色：`color`、`backgroundColor`、`borderColor`
- 边框：`borderWidth`、`borderRadius`
- 字体：`fontSize`、`fontWeight`、`lineHeight`、`textAlign`
- 布局：`alignSelf`、`justifySelf`
- 阴影：`shadow`
- 透明度：`opacity`

颜色值允许 `rgb(...)`、`rgba(...)`、`#RRGGBB`、`#RGB` 和受控主题 token 字符串。长度值允许 `px`、`%`、`rem`、`em`、`vw`、`vh`、`auto`。不允许完整 CSS 片段。

### 2.3 禁止字段

任何组件都不允许下列字段：

- `css`、`class`、`className`、`styleText`
- `html`、`innerHTML`、`outerHTML`
- `script`、`eval`
- `onClick`、`onInput`、`onChange` 等事件处理器字段
- 任意未在 catalog schema 中声明的属性

## 3. 组件优化方案

### 3.1 Text

现状：支持 `text` 和 `usageHint`，只能通过 `h1` 到 `caption` 映射固定 class。

优化：

- 增加 `variant`：`title`、`subtitle`、`body`、`caption`、`metric`。
- 增加 `tone`：用于正文、弱化文本、成功、警告、危险等语义颜色。
- 支持 `style.color`、`style.fontSize`、`style.fontWeight`、`style.lineHeight`、`style.textAlign`、`style.margin`。
- 增加 `maxLines`，用于多行截断。
- 保留 `usageHint` 作为语义标签选择，`variant` 负责视觉预设。

模型使用建议：标题优先用 `usageHint`，强调数字用 `variant: "metric"`，局部颜色用 `style.color`。

### 3.2 Row 与 Column

现状：支持 `children`、`distribution`、`alignment`，Row 固定横向 flex，Column 固定纵向 flex。

优化：

- 增加 `gap`，比通过 `style.gap` 更适合模型使用。
- 增加 `wrap`：Row 支持换行，Column 可忽略或用于子项自动换列的未来扩展。
- 支持 `style.width`、`style.height`、`style.padding`、`style.margin`、`style.backgroundColor`、`style.borderColor`、`style.borderRadius`。
- 增加 `preset`：`section`、`toolbar`、`grid`、`form`、`centered`。
- `distribution` 与 `alignment` 保持当前枚举，并继续映射为合法 flex 值。

模型使用建议：页面根节点常用 `Column + preset: "section"`；工具条常用 `Row + preset: "toolbar"`；表单常用 `Column + preset: "form"`。

### 3.3 Card

现状：支持 `child`，组件代码已有 `title` 渲染，但 Agent prompt 仍提示不要使用 `Card.title`，schema 也未声明 `title`。

优化：

- 正式支持 `title`，但仍推荐复杂标题用子 `Text` 组件表达。
- 增加 `variant`：`plain`、`outlined`、`elevated`、`filled`、`interactive`。
- 增加 `tone`：用于状态卡片，如成功、警告、危险。
- 支持 `style.padding`、`style.backgroundColor`、`style.borderColor`、`style.borderRadius`、`style.shadow`、`style.width`。
- 增加 `preset`：`summary`、`metric`、`formPanel`、`media`。

模型使用建议：简单卡片标题可用 `title`；需要副标题、操作区或复杂排版时，`child` 指向内部 `Column`。

### 3.4 Button

现状：支持 `child` 和 `action`，视觉固定为蓝色主按钮。

优化：

- 增加 `variant`：`primary`、`secondary`、`outline`、`ghost`、`danger`。
- 增加 `size`：`sm`、`md`、`lg`。
- 增加 `tone`：`brand`、`neutral`、`success`、`warning`、`danger`。
- 增加 `fullWidth`、`disabled`、`loading`。
- 增加 `iconPosition`：`left`、`right`，配合 child 内部 Row/Icon/Text 使用。
- 支持 `style.width`、`style.padding`、`style.borderRadius`、`style.backgroundColor`、`style.color`。

模型使用建议：主要动作使用 `variant: "primary"`，次要动作使用 `outline` 或 `ghost`，删除等危险操作使用 `tone: "danger"`。

### 3.5 表单组件

覆盖组件：`TextField`、`CheckBox`、`ChoicePicker`、`Slider`、`DateTimeInput`。

现状：组件具备基本输入和数据绑定能力，但字段布局、帮助信息、错误状态、禁用状态和尺寸密度不统一。

统一优化：

- 增加 `label` 的一致渲染策略；当前缺 label 渲染的组件应补齐。
- 增加 `placeholder`：适用于 `TextField`、`ChoicePicker`、`DateTimeInput`。
- 增加 `disabled`、`required`。
- 增加 `helpText`、`errorText`。
- 增加 `size`：`sm`、`md`、`lg`。
- 增加 `variant`：`outline`、`filled`、`plain`。
- 支持 `style.width`、`style.maxWidth`、`style.margin`。

组件专项优化：

- `TextField`：支持 `rows`、`minRows`，用于长文本输入。
- `CheckBox`：支持 `description`、`labelPosition`。
- `ChoicePicker`：支持 `multiple` 的未来扩展；当前先保持单选。
- `Slider`：支持 `step`、`showValue`、`valuePrefix`、`valueSuffix`。
- `DateTimeInput`：补充 `usageHint` 到 schema，支持 `date`、`time`、`datetime`。

模型使用建议：表单容器使用 `Column + preset: "form"`，字段组件用 `helpText` 解释输入，用 `errorText` 展示校验错误。

### 3.6 Image

现状：schema 已声明 `fit`，但组件未使用；组件只渲染 `url` 和 `alt`。

优化：

- 补齐 `fit` 到 `object-fit` 映射：`contain`、`cover`、`fill`、`none`、`scale-down`。
- 增加 `aspectRatio`：如 `1:1`、`4:3`、`16:9`。
- 增加 `preset`：`avatar`、`thumbnail`、`hero`、`logo`。
- 支持 `style.width`、`style.height`、`style.borderRadius`、`style.shadow`。
- 增加 `loading`：`lazy`、`eager`。

模型使用建议：人物头像用 `preset: "avatar"`，横幅图用 `preset: "hero"` 和 `fit: "cover"`。

### 3.7 Icon

现状：schema 使用 `name`，组件读取 `icon`，存在契约不一致；图标 fallback 目前只是文本或 emoji。

优化：

- 统一主字段为 `name`，Renderer 兼容读取旧字段 `icon`。
- 增加 `size`：`sm`、`md`、`lg`。
- 增加 `tone` 和 `style.color`。
- 增加 `preset`：`inline`、`badge`、`buttonIcon`、`status`。
- 支持 `style.backgroundColor`、`style.borderRadius`，用于带底色图标容器。

模型使用建议：普通文本旁图标使用 `preset: "inline"`，状态提示使用 `preset: "status"` 和语义 `tone`。

### 3.8 Video 与 AudioPlayer

现状：只支持 `url`，始终显示浏览器默认 controls。

优化：

- 增加 `controls`、`autoplay`、`loop`、`muted`。
- `Video` 增加 `poster`、`fit`、`aspectRatio`。
- 增加 `preset`：`inline`、`mediaCard`、`heroMedia`。
- 增加 `density`：`compact`、`comfortable`。
- 支持 `style.width`、`style.maxWidth`、`style.borderRadius`、`style.shadow`。

模型使用建议：课程、产品演示等视频用 `preset: "mediaCard"`；背景或首屏媒体用 `heroMedia`，但仍必须保留安全控制字段。

### 3.9 Divider

现状：无属性，固定水平分割线。

优化：

- 增加 `orientation`：`horizontal`、`vertical`。
- 增加 `thickness`、`color`、`spacing`。
- 增加 `variant`：`solid`、`dashed`、`dotted`。
- 增加 `label` 和 `labelAlign`，用于带文字分割线。
- 支持 `style.margin`、`style.borderColor`。

模型使用建议：内容分组使用默认水平线；工具栏或 Row 内部分隔使用 `orientation: "vertical"`。

### 3.10 List

现状：schema 声明 `direction`，组件未使用；列表固定为 `ul` 与垂直布局。

优化：

- 补齐 `direction`：`vertical`、`horizontal`。
- 增加 `marker`：`none`、`disc`、`decimal`、`check`。
- 增加 `gap`、`divided`、`wrap`。
- 增加 `preset`：`plain`、`dense`、`cardList`、`grid`。
- 支持 `style.padding`、`style.gap`、`style.backgroundColor`。

模型使用建议：普通清单用 `marker: "disc"`；卡片集合用 `preset: "cardList"`；横向标签列表用 `direction: "horizontal"` 和 `marker: "none"`。

### 3.11 Tabs

现状：组件兼容读取 `tabItems` 和 `tabs`，但 prompt 要求只能用 `tabItems`；视觉固定为下划线标签页。

优化：

- 主字段保持 `tabItems`，Renderer 可继续兼容 `tabs`，但 schema 和 prompt 不主动鼓励 `tabs`。
- 增加 `variant`：`underline`、`pills`、`segmented`。
- 增加 `size`：`sm`、`md`、`lg`。
- 增加 `tone`：控制激活态颜色。
- 增加 `align`：`start`、`center`、`end`、`stretch`。
- 增加 `fullWidth`。
- 支持 `style.width`、`style.margin`。

模型使用建议：页面主导航用 `variant: "underline"`；局部切换器用 `variant: "segmented"`；移动端常用 `fullWidth: true`。

### 3.12 Modal

现状：默认可见，支持点击遮罩和关闭按钮关闭；`trigger` 在 schema 中声明但组件未实现。

优化：

- 增加 `visible`，支持布尔值或 `{ path }` 绑定。
- 实现 `trigger`，允许通过指定子组件打开弹窗。
- 增加 `size`：`sm`、`md`、`lg`、`fullscreen`。
- 增加 `placement`：`center`、`right`、`bottom`。
- 增加 `closeOnOverlayClick`、`showCloseButton`。
- 增加 `overlayTone` 或 `overlayOpacity`。
- 增加 `title`、`footer` 的未来扩展字段；复杂结构仍推荐通过 `child` 内部容器表达。
- 支持 `style.width`、`style.maxWidth`、`style.padding`、`style.borderRadius`。

模型使用建议：确认弹窗使用 `size: "sm"`；复杂表单弹窗使用 `size: "lg"`；移动端底部抽屉使用 `placement: "bottom"`。

## 4. 实现同步清单

### 4.1 Renderer

- 在 `packages/renderer/src/components/basic/` 内引入统一样式解析 helper，集中处理 `style` 白名单、枚举 class 和默认值。
- 在 `packages/renderer/src/styles.css` 增加组件预设 class 与 CSS 变量，避免每个组件散落重复样式逻辑。
- 优先修复已存在的契约偏差：`Image.fit`、`List.direction`、`Icon.name/icon`、`DateTimeInput.usageHint`。
- 旧字段兼容应在 Renderer 层完成，Agent prompt 不主动鼓励旧字段。

### 4.2 Agent 与校验

- 更新 `packages/agent/src/schemas/basic-catalog-schema.json`，为每个组件放开新增白名单字段，继续保持 `additionalProperties: false`。
- 更新 `packages/agent/src/tools/catalog-schema.ts`，让 Prompt 能看到新增字段、枚举值和用途说明。
- 更新 `packages/agent/src/prompts/a2ui-protocol-guide.ts`，明确“允许受控 `style`，禁止任意 CSS/HTML/JS”，并给出组件示例。
- repair prompt 中应保留“只修复非法字段，不重写整棵 UI”的约束。

### 4.3 文档

- 更新 `docs/frontend/renderer/renderer-implementation.md`，引用本方案作为 Basic Catalog 能力升级依据。
- 更新 `docs/agent/agent-runtime-implementation.md`，说明 Agent 输出契约会包含受控样式字段。
- 更新 `docs/README.md`，将本方案加入 Renderer 文档索引。

## 5. 测试与验收

### 5.1 Renderer 组件测试

- 每个组件至少保留一个原有最小渲染用例，并新增一个样式参数用例。
- Row/Column 验证 `gap`、`padding`、`alignment`、`distribution` 不破坏 children 渲染。
- 表单组件验证 `disabled`、`placeholder`、`helpText`、`errorText` 不影响数据绑定。
- `Image.fit`、`List.direction`、`Icon.name/icon` 增加回归测试。
- 不传新增字段时，旧消息应保持当前默认视觉。

### 5.2 Agent 校验测试

- 新增白名单样式字段应通过 `validateA2UI`。
- 未允许字段如 `className`、`css`、`innerHTML`、`onClick` 应继续失败。
- Prompt 示例生成的 JSON 应通过 A2UI schema 和 Basic Catalog schema。

### 5.3 视觉验收

- 准备一组覆盖 18 个组件的 A2UI 样例，分别验证默认样式、简单样式值和复杂预设。
- 验证典型页面：仪表盘、表单、媒体卡片、列表详情、弹窗确认。
- 验证移动宽度下文本不溢出、按钮内容不重叠、容器间距稳定。

## 6. 推进顺序

1. 先补齐 Renderer 与 schema 已存在的不一致：`Image.fit`、`List.direction`、`Icon.name/icon`、`DateTimeInput.usageHint`。
2. 建立统一样式 helper 和 schema 片段，避免 18 个组件重复定义白名单。
3. 为布局、文本、按钮、卡片四类高频组件先接入 `variant`、`size`、`tone`、`style`。
4. 再统一表单组件能力，补充帮助信息、错误状态和禁用状态。
5. 最后扩展媒体、Tabs、Modal、Divider、List 的复杂预设。

## 7. 风险与约束

- 不允许把受控 `style` 扩展为任意 CSS，否则会破坏 Agent 输出安全边界。
- schema、prompt、Renderer 必须同步更新，否则模型会生成无法通过校验或无法渲染的字段。
- 组件默认值必须保持兼容，避免历史 A2UI events 和 snapshots 渲染变化过大。
- 新增视觉字段不应让 Renderer 依赖 `packages/frontend` 或 Naive UI。

