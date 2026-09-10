# 10 — 文档、能力矩阵和回归测试收尾

**What to build:** 项目文档、Basic Catalog 能力矩阵和回归测试同步新 Renderer 架构、Catalog 范围和 legacy 边界。

**Blocked by:** 02 — 让 Agent Catalog 摘要和组件详情读取单一真源; 03 — 让 validateA2UI 使用派生 Catalog schema; 09 — 切换 A2uiSurface 到新 Renderer 链路.

**Status:** resolved

- [x] A2UI 契约文档和 Renderer 文档记录新 Catalog 范围，且不再把 `Modal` 列为正式支持组件。
- [x] Basic Catalog 能力矩阵说明普通 UI 组件、RenderNode、resolver 和 legacy 组件边界。
- [x] 回归测试覆盖 Agent prompt、校验、RenderNode 快照、List/Tabs、model/action 和 Renderer DOM 行为。
- [x] 文档说明旧 Basic 组件保留为 legacy reference，不属于新链路依赖。
