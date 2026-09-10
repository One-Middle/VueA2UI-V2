# 01 — 去除 core model 的 Vue 响应式依赖

**What to build:** `DataModel`、`ComponentModel`、`SurfaceModel` 和 `SurfaceGroupModel` 使用普通 TypeScript 数据结构和显式订阅机制，不再 import Vue reactivity API。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `DataModel` 移除 Vue `reactive`，保留 JSON Pointer `get/set/delete/subscribe/destroy` API。
- [x] `DataModel.set("/")` 根替换通知所有已订阅路径。
- [x] `DataModel.set("/a/b")` 通知目标路径和祖先路径订阅者。
- [x] `DataModel.delete(path)` 保持现有删除语义和通知语义。
- [x] `ComponentModel` 使用普通 raw props 对象，`update()` 保持同类型更新规则。
- [x] `SurfaceModel.components` 使用普通 `Map<string, ComponentModel>`。
- [x] `SurfaceModel` 增加组件集合变更订阅或 revision 订阅能力。
- [x] `SurfaceGroupModel` 使用普通对象或 `Map`，并能通知 surface create/delete 变化。
- [x] `MessageProcessor` 行为保持不变。
- [x] 更新 core tests，移除依赖 Vue `computed` / `nextTick` 的断言方式。
- [x] Renderer core 不再从 `vue` import 任何 API。
