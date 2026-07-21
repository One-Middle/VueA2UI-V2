# 当前活跃计划

本文档只维护当前活跃或待启动的平台改造计划索引。计划细节应写入各自子目录，不在本文档中堆叠长任务清单。

## 1. 进行中

| 计划 | 状态 | 入口 | 影响范围 |
| --- | --- | --- | --- |
| Renderer JSRuntime 能力建设 | 计划中 | [plan.md](./2026-07-renderer-js-runtime/plan.md) | shared、agent、renderer、A2UI 契约、Renderer 能力矩阵 |

## 2. 待启动

| 计划 | 状态 | 建议目录 | 影响范围 |
| --- | --- | --- | --- |
| A2UI Button action 迁移 | 待建计划 | `2026-07-a2ui-action-event-migration/` | shared、agent、renderer、frontend、backend、A2UI 契约 |
| `action.functionCall` 执行边界设计 | 待建计划 | `2026-07-action-function-call-boundary/` | agent、backend、renderer、A2UI 契约、安全策略 |
| Renderer action/error 端到端回传核实 | 待建计划 | `2026-07-renderer-action-error-forwarding/` | frontend、backend、renderer、API 契约 |

## 3. 已完成

| 计划 | 完成日期 | 结果 | 影响范围 |
| --- | --- | --- | --- |
| Renderer dataModel 响应式优化 | 2026-07-21 | [result.md](./2026-07-renderer-datamodel-reactivity/result.md) | renderer、`docs/04-modules/`、`docs/CHANGELOG.md` |
| 文档治理体系改造 | 2026-07-19 | [result.md](./2026-07-docs-governance-rework/result.md) | `docs/`、AGENTS 文档入口规则 |

## 4. 维护规则

- 新的平台改造进入实施前，应创建独立计划目录。
- `current.md` 只记录计划索引、状态和入口。
- 计划执行清单维护在对应目录的 `checklist.md`。
- 计划完成后更新对应 `result.md`，并把长期事实迁移到产品、架构、契约或模块文档。
