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

## 6. 视觉质量标准

- 常见 UI 必须主动使用 Renderer 支持的语义和视觉字段，例如 role、density、variant、preset、intent、importance、shape、size、gap、padding、borderRadius、shadow、emphasis、usageHint、truncate。
- 重要数值或行情使用 metric/role/status 等语义；次级信息使用 caption/muted；操作区使用 role=actions。
- 媒体类 UI 要有 Image、标题、说明、进度或状态、主次操作。
- 业务面板要有明确主题、摘要、指标或列表、筛选/操作、事件回传。
- 工具类 UI 要有输入、列表状态、局部写回、批量操作和空状态。

## 7. 常见 bad case

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

## 8. 输出前检查

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
