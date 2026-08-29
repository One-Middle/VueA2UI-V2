# 02 — 让 Agent Catalog 摘要和组件详情读取单一真源

**What to build:** Agent prompt 可请求组件列表和组件详情披露不再维护自己的组件知识，而是读取 Basic Catalog Definition；模型不再看到 `Modal`。

**Blocked by:** 01 — 建立 Basic Catalog TypeScript 单一真源.

**Status:** resolved

- [x] Agent prompt 中可请求的 Basic Catalog 组件摘要来自 Catalog definition。
- [x] 组件详情披露来自 Catalog definition，并保留现有渐进披露行为。
- [x] `Modal` 不再出现在 prompt 可用组件列表或组件详情查询结果中。
- [x] 相关 Agent runtime 测试覆盖组件摘要和组件详情来源变化。
