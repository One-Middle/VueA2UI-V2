# 05 — 实现 RenderNode builder 的声明式组件闭环

**What to build:** 声明式 Basic 组件可以从 A2UI ComponentModel 解析成 RenderNode，覆盖普通 props、model binding、action binding 和基础 slots。

**Blocked by:** 01 — 建立 Basic Catalog TypeScript 单一真源; 04 — 创建普通 Vue Basic UI 组件库的第一条渲染闭环.

**Status:** resolved

- [x] RenderNode 类型包含 type、props、events、slots 和最小 meta。
- [x] `resolveProps` 处理 `prop/display/visual/state` 字段，并复用现有动态值语义。
- [x] `resolveModelBindings` 将 model 字段映射为 `modelValue`，仅在 `{ path }` 时生成写回事件意图。
- [x] `resolveActionBindings` 保持现有 A2UI action 协议，并支持 `Button.action -> click`。
- [x] 基础 `child/children` 能解析为 RenderNode slots。
