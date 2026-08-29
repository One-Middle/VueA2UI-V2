# 09 — 切换 A2uiSurface 到新 Renderer 链路

**What to build:** `A2uiSurface` 使用新 RenderNode 构建和 Vue renderer 渲染 root，不再递归使用旧 `A2uiComponent.vue`。

**Blocked by:** 06 — 实现 dependency-collected tree rebuild; 08 — 补齐剩余普通 Basic UI 组件并接入 Vue renderer.

**Status:** resolved

- [x] `A2uiSurface` 从 root component 构建 RenderNode tree 并渲染为 VNode。
- [x] 新链路不使用 `componentContextKey` 或旧 `A2uiComponent.vue` 递归入口。
- [x] action 和 renderer error 仍通过既有 CustomEvent 边界派发。
- [x] dataModel 更新、属性脚本、model 写回、List 动态渲染和 Tabs 切换在 surface 集成测试中通过。
