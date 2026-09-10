# 04 — 创建普通 Vue Basic UI 组件库的第一条渲染闭环

**What to build:** 新普通组件库提供第一组可独立 mount 的 Basic UI 组件，组件只接收 Vue props、slots 和普通事件，不依赖 A2UI core/context。

**Blocked by:** 01 — 建立 Basic Catalog TypeScript 单一真源.

**Status:** resolved

- [x] 新 UI 组件目录包含基础展示、布局和 Button 的普通 Vue 组件。
- [x] 新组件不 import `componentContextKey`、`ComponentModel`、`DataContext` 或 `A2uiComponent`。
- [x] Button 使用普通 `click` 事件和 default slot。
- [x] 组件级测试能通过普通 props/slots/events 单独验证渲染行为。
