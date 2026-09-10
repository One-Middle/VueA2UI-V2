# 02 — 实现 RenderPlan 与 SurfaceRuntime

**What to build:** 将现有 RenderNode 构建管线固化为纯数据 RenderPlan，并实现每 surface 独立的 `SurfaceRuntime` 快照、订阅、调度和释放 API。

**Blocked by:** 01 — workspace package 边界。

**Status:** resolved

- [x] 定义稳定的 `RenderPlan`、RenderPlan snapshot、组件地址和 `AdapterEvent` 类型。
- [x] 将现有 resolver、依赖收集和 RenderNode 构建管线迁入 Core，并移除平台类型泄漏。
- [x] 实现 `SurfaceRuntime.getSnapshot()`、`subscribe()`、`dispatch()`、`dispose()`。
- [x] Runtime 按实际读取的动态路径同步 DataModel 订阅。
- [x] Runtime 以微任务批处理失效并发布完整 RenderPlan 快照。
- [x] 组件树、surface 集合和 dataModel 更新均能使相应 Runtime 失效。
- [x] 为 RenderPlan 的纯数据边界、快照订阅和依赖变更添加单元测试。
