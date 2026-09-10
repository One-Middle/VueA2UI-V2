# 05 — 迁移 frontend 和 renderer capability demo 到 DOM renderer

**What to build:** 让当前 demo 和 frontend preview 使用新的 DOM mount API 或 Web Component，并保持 action/error 交互链路可用。

**Blocked by:** 02 — 实现 DOM Surface Host 和函数式 mount API; 03 — 实现 DOM RenderNode renderer 和 Basic UI 组件; 04 — 实现 Web Component wrapper.

**Status:** resolved

- [x] 更新 renderer capability demo，移除 Vue App/SFC 入口。
- [x] demo 使用函数式 mount API 或 `<a2ui-surface>` Web Component。
- [x] demo 仍覆盖现有 cases，包括 dataModel 更新、List、Tabs、表单写回和 action.script。
- [x] 更新 `packages/frontend` preview 集成，在 Vue 宿主中挂载纯 DOM renderer 子树。
- [x] frontend 组件只负责提供 container 和调用 mount/unmount，不重新解释 A2UI 协议。
- [x] 保持 `a2ui:action` 和 `a2ui:error` 的现有消费行为。
- [x] 增加或迁移 DOM 行为测试，覆盖深层 dataModel 更新后 DOM 刷新。
- [x] 增加或迁移 DOM 行为测试，覆盖 List item 相对路径和新增 item。
- [x] 增加或迁移 DOM 行为测试，覆盖 action.script 写回和事件派发。
- [x] 增加或迁移 DOM 行为测试，覆盖 TextField 输入写回。
- [x] 增加或迁移 DOM 行为测试，覆盖 Tabs 切换和 activeKey 状态保留。
