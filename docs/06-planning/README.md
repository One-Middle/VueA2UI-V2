# 平台改造计划入口

`06-planning/` 用于保存每次平台改造、迁移、重构和能力建设的计划、执行过程和结果。

本目录不是单一 TODO 列表。每次较大的改造都应创建独立子目录，`current.md` 只维护活跃计划索引。

## 1. 目录结构

```text
06-planning/
  README.md
  current.md
  backlog.md
  YYYY-MM-short-topic/
    context.md
    plan.md
    checklist.md
    progress.md
    decisions.md
    result.md
```

## 2. 子目录命名

使用 `YYYY-MM-short-topic`：

- `2026-07-docs-governance-rework`
- `2026-07-a2ui-action-event-migration`
- `2026-08-renderer-state-refactor`

## 3. 文件职责

| 文件 | 职责 |
| --- | --- |
| `context.md` | 背景、问题、目标、非目标、影响范围 |
| `plan.md` | 实施方案、阶段划分、涉及模块 |
| `checklist.md` | 可执行任务清单 |
| `progress.md` | 执行过程记录 |
| `decisions.md` | 计划过程中的小型决策 |
| `result.md` | 完成结果、验证情况、遗留问题 |

## 4. 维护规则

- 新平台改造开始时，先创建计划目录，再改代码或权威文档。
- 计划中产生的长期事实必须迁移到产品、架构、契约或模块文档。
- 完成的计划不必移入归档，保留在 `06-planning/` 作为项目演进记录。
- 已失效或放弃的计划在 `result.md` 中说明原因。
