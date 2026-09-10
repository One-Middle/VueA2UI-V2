# 06 — 集成接入与跨 Adapter 契约验证

**What to build:** 将前端预览接入 Vue Adapter，保留 DOM demo/mount 使用方式，并建立共享测试用例验证 Runtime 与三个 Adapter 的一致行为。

**Blocked by:** 04 — DOM Adapter；05 — Vue 与 React Adapter。

**Status:** resolved

- [x] 将 Frontend PreviewPanel 改为通过 Vue Adapter 消费 SurfaceRuntime。
- [x] 将 DOM capability demo 保持为 DOM Adapter 的独立验证入口。
- [x] 在 Core Runtime tests 中建立共享消息模型与快照/action 断言基础。
- [x] 在共享 Core/DOM 契约中验证动态 path、属性脚本 deps、model 写回、action、script、List 和 Tabs 状态；Vue/React 分别验证快照刷新和 AdapterEvent 回流。
- [x] 验证 Runtime action 回调与 DOM CustomEvent payload 的统一 action 语义。
- [x] 运行各 package 的 typecheck、test、build 与前端集成测试。
- [x] 更新 implementation 文档与能力矩阵，使其反映实际代码。
