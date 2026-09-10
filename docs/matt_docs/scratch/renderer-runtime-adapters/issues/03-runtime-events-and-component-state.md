# 03 — 收拢协议事件与组件本地状态

**What to build:** 将 model 写回、action/script、错误报告和组件本地状态从 DOM Host 中收拢到框架无关 Runtime。

**Blocked by:** 02 — RenderPlan 与 SurfaceRuntime。

**Status:** resolved

- [x] 将现有 DomStateStore 抽象为 Core 的 `ComponentStateStore`。
- [x] 定义 Adapter 读取和写入组件局部状态的 Runtime API。
- [x] 由 `SurfaceRuntime.dispatch()` 统一解释 model-set、action-event 和 action-script 语义。
- [x] 定义框架无关的 `onAction`、`onError` 宿主回调。
- [x] 保持 dataModel 相对路径、List item 作用域和 action script 的既有语义。
- [x] 保持 `action.functionCall` 不执行的契约。
- [x] 为受控组件写回、脚本、错误和跨计划更新的局部状态添加测试。
