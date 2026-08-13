<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
skill: "A2UI v0.9 组件消息生成"
id: "a2ui-generation-standards"
title: "A2UI 标准生成规则"
description: "生成 UI 前必须请求；包含符合 Renderer 的完整消息结构、组件树、dataModel、List、表单、事件、JSRuntime、安全边界、bad case 和输出检查。"
---

# A2UI 标准生成规则

本 Reference 是生成、修改或修复 A2UI v0.9 UI 的标准规则。创建或修改 UI 前必须掌握本 Reference。

## 1. 完整消息结构

最终输出必须是严格 JSON 对象，形如：

```json
{
  "assistantMessage": "先复述用户需求，再说明生成或修改了什么",
  "a2uiMessages": [
    { "version": "v0.9", "createSurface": { "surfaceId": "main", "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json" } },
    { "version": "v0.9", "updateDataModel": { "surfaceId": "main", "path": "/", "value": {} } },
    { "version": "v0.9", "updateComponents": { "surfaceId": "main", "components": [] } }
  ]
}
```

新 UI 必须先 createSurface，再 updateDataModel（如果 UI 使用动态数据、列表、状态或交互），最后 updateComponents。修改已有 UI 时，根据当前 snapshot 输出必要的增量消息；不要无意义删除重建。

## 2. 组件树标准

- 每个组件必须有稳定、可读、唯一的 id，必须有 component。
- 必须存在 id 为 root 的根组件。
- Container、Card、Column、Row、Grid、List 等容器只通过 child、children 或模板字段引用其他组件 id。
- child 是单个字符串 id；children 是字符串 id 数组；不要把完整组件对象塞进 children。
- Card 内有多个元素时，先创建 Column/Row，再让 Card.child 指向这个容器。
- 重复内容不要写 row1、row2、row3；优先 dataModel 数组 + List 模板。
- 复杂 UI 先拆信息架构：头部、摘要、主体、列表、操作区、状态区，而不是把所有文本压成同级 Row。

## 3. dataModel 建模标准

- 静态一次性文案可以直接写入组件字段。
- 列表、筛选、收藏、播放状态、表单输入、进度、统计、选中项、批量操作结果必须进入 dataModel。
- dataModel 的根路径使用业务域名聚合，例如 /player、/song、/finance、/todo。
- List 模板内使用相对 path，如 { "path": "title" }；模板外使用绝对 path，如 { "path": "/finance/headline" }。
- 需要从状态派生文案、图标、按钮 label 或统计值时，用属性 script；不要手动维护多份容易不一致的静态字段。

## 4. 交互和 action 标准

- 只需要通知宿主的操作，使用 action.event。
- 需要点击后先修改本地 dataModel，再通知宿主的操作，使用 action.script。
- action.script 只能执行短小、同步、确定性的逻辑；通过 dataModel.get 读取，通过 dataModel.set 写入 JSON-compatible 值，通过 actions.emit 派发事件。
- List 模板中的按钮如需知道当前 item，使用 action.script.context 传入 { path: "id" } 等相对绑定。
- 按钮不能只有视觉外观；可点击业务按钮必须有 action.event 或 action.script。

## 5. JSRuntime 安全边界

- 属性 script 必须显式 return，必须声明 deps，必须提供 fallback。
- 属性 script 只能读取 dataModel，不要写入 dataModel。
- Button.action.script 可以读取和写入 dataModel，但仍然不能访问 DOM、window、document、fetch、网络、定时器、import、async/await、eval、Function、Promise 或外部 API。
- 不要生成 <script>、javascript:、HTML 字符串、onClick、onInput、onChange、innerHTML、className 或 css 字段。

## 6. 语义优先，style 覆盖

Renderer 有两套方式控制组件视觉，必须区分使用：

### 6.1 组件顶层语义字段（优先使用）

这些字段直接放在组件对象上，Renderer 根据它们应用预设样式。优先使用语义字段可以保证视觉一致性：

| 字段 | 类型 | 说明 | 常用值 |
|------|------|------|--------|
| role | string | 组件语义角色 | default, summary, metric, media, form, interactive, actions, metadata, mediaObject, emptyState |
| density | string | 内容密度 | compact, comfortable, spacious |
| variant | string | 视觉变体 | elevated, filled, plain, outline, ghost |
| preset | string | 复杂样式预设 | media, metric, title, subtitle, body, caption, summary, formPanel |
| intent | string | 按钮业务意图 | primary, secondary, danger, success, warning |
| importance | string | 按钮视觉重要程度 | normal, quiet, prominent |
| shape | string | 形状 | rounded, pill, square, circle |
| size | string | 尺寸密度 | sm, md, lg |
| emphasis | string | 文本强调语义 | default, muted, strong, danger, success, warning |
| usageHint | string | 文本样式提示 | h1, h2, h3, h4, h5, body, caption |
| truncate | boolean | 是否单行截断 | true, false |
| tone | string | 语义色调 | neutral, brand, success, warning, danger |
| icon | string | 按钮图标名称（直接字符串，不是 style） | "plus", "search", "calendar_today" |
| iconPosition | string | 图标位置 | left, right, only |
| fullWidth | boolean | 是否撑满父容器宽度 | true, false |

### 6.2 style 对象（精准覆盖）

当语义字段不足以表达需求时，在组件上添加 `"style": { ... }` 对象。**以下字段只能放在 style 对象内，不能放在组件顶层**：

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| width | string | 宽度 | "100%", "200px" |
| height | string | 高度 | "auto", "48px" |
| minWidth | string | 最小宽度 | "0", "120px" |
| maxWidth | string | 最大宽度 | "600px" |
| minHeight | string | 最小高度 | |
| maxHeight | string | 最大高度 | |
| padding | string | 四向内边距 | "16px", "12px 16px" |
| paddingX | string | 水平内边距（展开为 paddingLeft+paddingRight） | "16px" |
| paddingY | string | 垂直内边距（展开为 paddingTop+paddingBottom） | "8px" |
| margin | string | 四向外边距 | "0 auto" |
| marginX | string | 水平外边距（展开为 marginLeft+marginRight） | |
| marginY | string | 垂直外边距（展开为 marginTop+marginBottom） | |
| gap | string | 子元素间距（Column/Row/Grid 也可作顶层字段） | "8px", "14px" |
| color | string | 文字颜色 | "#ffffff", "#1a1a2e" |
| backgroundColor | string | 背景颜色 | "#f8fafc", "#0F2A2E" |
| borderColor | string | 边框颜色 | "#e5e7eb", "#3c2d18" |
| borderWidth | string | 边框宽度 | "1px", "2px" |
| borderRadius | string | 圆角 | "8px", "12px", "24px" |
| fontSize | string | 字号 | "14px", "22px" |
| fontWeight | number|string | 字重 | "400", "700", "900" |
| lineHeight | number|string | 行高 | "1.5", "1.7" |
| textAlign | string | 文字对齐 | "center", "right" |
| alignSelf | string | 自身交叉轴对齐 | "center" |
| justifySelf | string | 自身主轴对齐 | |
| shadow | string | 阴影（映射到 boxShadow），允许值 none|xs|sm|md|lg | "sm", "md" |
| opacity | number|string | 透明度 | "0.8", "0.5" |
| overflow | string | 溢出行为 | "hidden" |
| flex | number|string | 弹性伸缩 | "1", "0" |

### 6.3 常见混淆

**style 子字段，不能放在组件顶层：** padding, borderRadius, shadow, backgroundColor, color, fontWeight, fontSize, lineHeight, borderColor, borderWidth, opacity, overflow, flex, width, height, minWidth, maxWidth, textAlign（gap 在 Column/Row/Grid 上也可作为顶层字段）。

**组件顶层字段，不能放在 style 内：** role, density, variant, preset, intent, importance, shape, size, emphasis, usageHint, truncate, tone, icon, iconPosition, fullWidth, child, children, action。

## 7. style 白名单与视觉设计指南

以下 5 个设计模式覆盖了 90% 的视觉需求。每个模式给出核心 style 字段和参考实例。

### 模式 1：暗色主题卡片

适用场景：媒体播放、金融资讯、夜间模式面板。

核心字段组合：
- backgroundColor：深色背景（如 #080807, #0F2A2E）
- color：浅色文字（如 #ffffff, #f8edcf）
- borderColor：比背景稍亮的边框（如 #2f2415），拉开层次
- 子元素用 color/fontWeight 微调区分重要性

参考实例：Finance Brief（黑金金融卡）——外围 Card 使用 backgroundColor: "#080807" + color: "#f8edcf" + borderRadius: "24px" + shadow: "lg"，内部 hero 区块用稍亮的 backgroundColor: "#14100a" 做层次。

### 模式 2：圆角 + 阴影层次

适用场景：商品卡、仪表盘、信息流卡片。

核心字段组合：
- borderRadius：外层主卡片 16-24px（如 "20px", "24px"），内层区块 8-18px，标签 4px 或 999px（pill 形状）
- shadow：外层卡片用 sm 或 md，内层区块通常不设阴影
- overflow：配合 borderRadius 做圆角裁剪时设为 "hidden"

参考实例：Live Commerce——外层 liveCard 使用 borderRadius: "20px" + shadow: "md" + overflow: "hidden"，内层标签 liveBadge 使用 borderRadius: "4px"。

### 模式 3：色彩层次

适用场景：卡片式布局、数据看板。

三层配色方法：
1. 页面/外层背景：浅灰（#f8fafc）或深色（#080807）
2. 卡片背景：白色（#ffffff）或比外层稍亮的颜色
3. 强调色点缀：品牌色用于关键指标、主按钮、状态标签，不要滥用

参考实例：Work Board——主卡片白色背景 + sm 阴影；统计区三张指标卡分别用紫色（#f5f3ff）、琥珀色（#fffbeb）、绿色（#f0fdf4）做语义区分；添加按钮用 backgroundColor: "#7c3aed" 品牌色。

### 模式 4：字重节奏

适用场景：任何有信息层级的 UI。

字重层级：
- 标题/关键数值：fontWeight: "800" 或 "900"，配合 usageHint: "h2"-"h4"
- 正文：默认 fontWeight（400），需要强调时用 emphasis: "strong"，弱化时用 emphasis: "muted"
- 辅助信息（时间、来源、标签）：usageHint: "caption" + emphasis: "muted"
- 价格/指标数据：role: "price" + variant: "metric" + fontWeight: "800"

参考实例：Live Commerce 价格使用 fontSize: "22px" 放大；Finance Brief 标题用 fontWeight: "900" + usageHint: "h2"；Work Board 指标数值使用 fontWeight: "800" + usageHint: "h4"。

### 模式 5：间距系统

适用场景：所有布局。

常用取值约定：
- gap：紧凑 3-5px、标准 8-10px、宽松 14px
- padding：卡片内边距 12-18px（如 "16px", "18px"），标签内边距 2-6px + 6-10px（如 "3px 8px"）
- borderRadius：标签 4px、卡片 8-12px、主卡片 16-24px、pill 999px
- fontWeight：辅助 400、标题 700-800、强调数值 800-900

参考实例：Work Board 主卡片 style: { padding: "16px" }，子区域 gap: "14px"，标签 style: { padding: "3px 8px", borderRadius: "999px" }。

## 8. 常见 bad case

### Bad Case A：平铺文本，没有结构

```json
{
  "id": "root",
  "component": "Column",
  "children": ["t1", "t2", "t3"]
}
```

问题：没有标题区、内容区、操作区，也没有 Card/List/Grid 等承载结构。即使能渲染，也不像完整 UI。

### Bad Case B：重复内容不用 dataModel + List

```json
[
  { "id": "row1", "component": "Row", "children": ["title1", "button1"] },
  { "id": "row2", "component": "Row", "children": ["title2", "button2"] }
]
```

问题：数据和结构耦合，无法筛选、批量操作或响应式更新。重复内容应进入 dataModel 数组，并用 List 模板渲染。

### Bad Case C：按钮是假交互

```json
{ "id": "saveButton", "component": "Button", "label": "收藏" }
```

问题：按钮没有 action，用户点击不会产生业务事件，也不会写回本地状态。业务按钮必须使用 action.event 或 action.script。

### Bad Case D：脚本越界

```json
{ "script": { "code": "fetch('/api/save'); document.body.innerHTML = 'ok';" } }
```

问题：JSRuntime 不是浏览器环境，禁止 fetch、document、DOM、网络和 HTML 注入。

### Bad Case E：组件引用不合法

```json
{ "id": "root", "component": "Card", "children": [{ "id": "title", "component": "Text", "text": "Hi" }] }
```

问题：Card 应使用 child，不应使用 children；children 也不能嵌套完整组件对象。必须使用邻接表引用组件 id。

### Bad Case F：style 字段误放在组件顶层

```json
{
  "id": "card",
  "component": "Card",
  "child": "body",
  "padding": "10px",
  "borderRadius": "12px"
}
```

问题：padding 和 borderRadius 是 style 子字段，必须嵌套在 `"style": {}` 内。上面写法即使校验通过，渲染器也会忽略这些字段。正确写法：

```json
{
  "id": "card",
  "component": "Card",
  "child": "body",
  "style": { "padding": "10px", "borderRadius": "12px" }
}
```

## 9. 输出前检查

- 是否已经请求并遵循 a2ui-generation-standards？
- 复杂 UI 是否请求 high-quality-a2ui-good-cases 作为质量标杆？
- 新 UI 是否包含 createSurface、必要的 updateDataModel 和 updateComponents？
- catalogId、surfaceId、root 是否正确？
- 所有 child/children/template 引用是否真实存在？
- 重复数据是否使用 dataModel + List？
- 交互按钮是否有 action.event 或 action.script？
- action.script 是否只做同步本地读写和 actions.emit？
- 是否避免 Catalog 外组件和浏览器字段？
- 是否使用足够的语义、密度、视觉和状态字段，让 UI 不只是默认 Card/Row/Text？
- style 对象内的字段是否都在白名单内？padding、borderRadius、shadow 等是否误放在组件顶层？
- 是否合理使用 dark 主题 / 圆角阴影 / 色彩层次 / 字重 / 间距等设计模式？
