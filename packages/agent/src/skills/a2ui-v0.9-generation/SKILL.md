<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
name: "A2UI v0.9 组件消息生成"
description: "用于生成、修改或修复合法 A2UI v0.9 server-to-client 组件消息；包含标准生成规则和高质量 good case references；当用户要求创建或修改 UI 时必须使用。"
sourceType: "platform"
---

# A2UI v0.9 组件消息生成

当用户要求创建、修改或修复 UI/A2UI 组件消息时，必须遵循本 Skill。

## 1. 最终输出结构

必须只输出严格 JSON 对象，不要使用 Markdown 代码块，不要输出 JSON 之外的解释文字。

{
  "assistantMessage": "先简要复述你对用户需求的理解，再说明生成或修改了什么",
  "a2uiMessages": []
}

如果用户只是聊天、解释或询问，并没有要求创建或修改 UI，则 a2uiMessages 必须是空数组 []。

## 2. 必须先请求的 Reference

- 生成、修改或修复 A2UI UI 前，必须先请求 `a2ui-generation-standards`。
- 复杂 UI、视觉质量要求高或需要标杆示例时，再请求 `high-quality-a2ui-good-cases`。

## 3. 使用范围

本 Skill 描述 A2UI v0.9 组件消息的生成约束和质量标准。

## 4. 最小硬性规则

- 最终 a2uiMessages 只能包含 A2UI v0.9 server-to-client 消息。
- 新 UI 必须按 createSurface -> updateDataModel（如需要）-> updateComponents 的顺序输出。
- createSurface.catalogId 使用 https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json，surfaceId 固定使用 "main"。
- 每个组件对象必须包含 id 和 component；必须存在 id 为 root 的根组件。
- A2UI 使用邻接表：child/children/tabItems.child 只能引用组件 id 字符串，不要嵌套组件对象。
- 动态数据使用 DataContext 作用域路径：模板外优先用绝对 path，如 { "path": "/some/data/path" }；List/Grid 模板内可用相对 path，如 { "path": "title" }；重复内容优先使用 dataModel 数组 + List 模板。
- Button.action 只能使用 action.event 或 action.script；需要本地状态写回时才使用 action.script。
- 受限 JSRuntime 不是浏览器 JavaScript，不能访问 DOM、window、document、fetch、网络、定时器、import、async/await、eval 或外部 API。
- 禁止生成任意 HTML、CSS、className、innerHTML、onClick/onChange 等浏览器字段。

## References

- [A2UI 标准生成规则](./references/a2ui-generation-standards.md)：包含符合 Renderer 的完整消息结构、组件树、dataModel、List、表单、事件、JSRuntime、安全边界、bad case 和输出检查。
- [高质量 A2UI Good Case](./references/high-quality-a2ui-good-cases.md)：适用于复杂 UI 或质量标杆场景；包含 Live Commerce（亮色电商）、Finance Brief（黑金金融）、Work Board（清爽工具）三个完整 good case，覆盖三种视觉范式。
