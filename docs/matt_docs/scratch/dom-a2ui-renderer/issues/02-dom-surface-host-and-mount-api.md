# 02 — 实现 DOM Surface Host 和函数式 mount API

**What to build:** 新增 DOM renderer 的运行时宿主，负责 mount、rebuild、依赖订阅同步、微任务调度、焦点恢复、事件派发和 unmount 清理。

**Blocked by:** 01 — 去除 core model 的 Vue 响应式依赖.

**Status:** resolved

- [x] 新增 `DomSurfaceHost`，接收 `container`、`surfaceGroup`、`surfaceId` 和可选配置。
- [x] 新增 `mountA2uiSurface(container, options)`，返回 `{ update, unmount }` handle。
- [x] `DomSurfaceHost` 复用 `buildRenderTree` 构建 RenderNode tree。
- [x] `DomSurfaceHost` 同步 RenderNode dependencies 到 `DataModel.subscribe`。
- [x] dataModel 依赖变更后通过 `queueMicrotask` 合并 rebuild。
- [x] component/surface 变更后通过同一调度器触发 rebuild。
- [x] `handle.update()` 触发同步 rebuild。
- [x] `handle.unmount()` 清理 DOM、订阅、事件监听、pending microtask 标记和状态引用。
- [x] surface 缺失时渲染当前等价 empty state。
- [x] root component 缺失时渲染当前等价 empty state。
- [x] rebuild 前后尽量恢复焦点和文本选择区间。
- [x] action/error 事件优先从 container 派发，同时保留 window 兼容策略。
