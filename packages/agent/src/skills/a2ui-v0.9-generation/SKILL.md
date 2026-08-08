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

当用户要求创建、修改或修复 UI/A2UI 组件消息时，必须遵循本 Skill。除非用户只是纯文字聊天，否则生成前必须先掌握本 Skill 的完整规则。

## 1. 最终输出结构

当你已经掌握所需 Skill Reference 和组件字段后，必须只输出严格 JSON 对象，不要使用 Markdown 代码块，不要输出 JSON 之外的解释文字。

{
  "assistantMessage": "先简要复述你对用户需求的理解，再说明生成或修改了什么",
  "a2uiMessages": []
}

如果用户只是聊天、解释或询问，并没有要求创建或修改 UI，则 a2uiMessages 必须是空数组 []。

## 2. 必须先请求的 Reference

当用户要求创建、修改或修复 UI 时，生成前必须先请求本 Skill 下的 a2ui-generation-standards，不要只凭摘要生成 A2UI。

如果用户需求涉及复杂 UI、列表/表单/媒体卡、业务面板、本地状态、筛选、收藏、播放、批量操作、强视觉主题或你需要质量标杆，继续请求 high-quality-a2ui-good-cases。

## 3. Skill Reference 请求结构

{
  "assistantMessage": "需要查看相关参考资料后再生成。",
  "skillReferenceRequest": {
    "skill": "builtin:a2ui-v0.9-generation",
    "references": ["a2ui-generation-standards"],
    "reason": "需要遵循 A2UI 标准生成规则"
  }
}

references 只能填写已启用 Skill 摘要中的 reference id 或 title，也可以填写 "*" 请求本 Skill 下全部 references。

## 4. Skill 内容请求结构

如果你需要遵循其他已启用 Skill 的完整规则，先输出 Skill 内容请求，不要凭摘要猜测完整规则。

{
  "assistantMessage": "需要查看相关 Skill 后再生成。",
  "skillInfoRequest": {
    "skills": ["skill-id-or-name"],
    "reason": "需要遵循该 Skill 的生成规范"
  }
}

skillInfoRequest.skills 只能填写已启用 Skill 摘要中的 id 或 name。优先使用 id。

## 5. 组件详情请求结构

如果你还不知道某些组件的可用字段、必填项或枚举值，先输出组件详情请求，不要猜字段。

{
  "assistantMessage": "需要查看组件详情后再生成。",
  "componentInfoRequest": {
    "components": ["Container", "Column", "Text", "Card"],
    "reason": "需要布局、文本和卡片容器字段"
  }
}

componentInfoRequest.components 只能填写 Basic Catalog 中存在的组件名称。

## 6. 最小硬性规则

- 最终 a2uiMessages 只能包含 A2UI v0.9 server-to-client 消息。
- 新 UI 必须按 createSurface -> updateDataModel（如需要）-> updateComponents 的顺序输出。
- createSurface.catalogId 使用 https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json，surfaceId 固定使用 "main"。
- 每个组件对象必须包含 id 和 component；必须存在 id 为 root 的根组件。
- A2UI 使用邻接表：child/children/tabItems.child 只能引用组件 id 字符串，不要嵌套组件对象。
- 动态数据使用 JSON Pointer：{ "path": "/some/data/path" }；重复内容优先使用 dataModel 数组 + List 模板。
- Button.action 只能使用 action.event 或 action.script；需要本地状态写回时才使用 action.script。
- 受限 JSRuntime 不是浏览器 JavaScript，不能访问 DOM、window、document、fetch、网络、定时器、import、async/await、eval 或外部 API。
- 禁止生成任意 HTML、CSS、className、innerHTML、onClick/onChange 等浏览器字段。
- 正式提交前必须通过 validateA2UI；不要绕过校验或提交未校验草稿。

## References

- [A2UI 标准生成规则](./references/a2ui-generation-standards.md)：生成 UI 前必须请求；包含符合 Renderer 的完整消息结构、组件树、dataModel、List、表单、事件、JSRuntime、安全边界、bad case 和输出检查。
- [高质量 A2UI Good Case](./references/high-quality-a2ui-good-cases.md)：复杂 UI 或需要质量标杆时请求；包含来自 renderer-capability-demo 的 Music Player、Finance Brief、Work Board 三个完整 good case，并说明为什么好。
