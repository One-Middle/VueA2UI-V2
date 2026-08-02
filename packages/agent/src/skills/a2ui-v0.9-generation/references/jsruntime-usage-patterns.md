<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
skill: "A2UI v0.9 组件消息生成"
id: "jsruntime-usage-patterns"
title: "JSRuntime 使用模式"
description: "说明什么时候应该使用受限 JSRuntime，以及属性脚本和按钮脚本的边界。"
---

# JSRuntime 使用模式

JSRuntime 用于声明式绑定难以表达的少量同步逻辑，不是浏览器 JavaScript 环境。

## 应该使用的场景

- 从 dataModel 派生文案，例如播放/暂停、已完成/待处理。
- 从 dataModel 派生 Icon.name、Text.text、style.color 等允许脚本的属性。
- 点击按钮后先更新本地 dataModel，再通过 actions.emit 通知宿主。

## 不应该使用的场景

- 静态文案或简单 { path } 数据绑定可以表达时，不要使用脚本。
- 不要访问 DOM、window、document、fetch、localStorage、网络、定时器、import、async/await、eval 或 Function。
- 不要生成 HTML 字符串、<script>、javascript: URL 或 onClick/onChange 等事件处理器字段。

## 示例

属性脚本：

{ "script": { "code": "return dataModel.get('/player/isPlaying') ? 'pause' : 'play_arrow';", "deps": ["/player/isPlaying"], "fallback": "play_arrow" } }

按钮脚本：

{ "script": { "code": "const next = !Boolean(dataModel.get('/player/isPlaying')); dataModel.set('/player/isPlaying', next); actions.emit('playToggled', { isPlaying: next });", "deps": ["/player/isPlaying"] } }
