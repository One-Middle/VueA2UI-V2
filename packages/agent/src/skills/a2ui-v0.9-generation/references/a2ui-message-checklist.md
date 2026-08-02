<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
skill: "A2UI v0.9 组件消息生成"
id: "a2ui-message-checklist"
title: "A2UI 消息生成检查清单"
description: "输出 A2UI 消息前的结构、绑定、交互和安全检查项。"
---

# A2UI 消息生成检查清单

输出前逐项确认：

- 新 UI 是否包含 createSurface、必要的 updateDataModel 和 updateComponents。
- surfaceId 是否固定为 main。
- 是否存在 id 为 root 的组件。
- child、children、tabItems.child 是否只引用真实存在的组件 id。
- 重复内容是否优先使用 dataModel 数组和 List 模板。
- Button.action 是否使用 action.event 或 action.script，而不是旧版 { name }。
- 是否避免了 Catalog 外组件，例如 div、table、input、select、Schedule、Calendar。
- 是否避免了 className、css、innerHTML、onClick、onInput、onChange。
- 是否在常见 UI 中使用 gap、padding、borderRadius、variant、tone、size、preset 等受控视觉字段。
