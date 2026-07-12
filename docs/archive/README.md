# Archive 详细文档入口

`docs/archive/` 保存各模块的详细历史文档、实施细节和迁移参考。

归档文档不直接作为当前实现契约；当前权威说明仍以 `docs/modules/`、`docs/contracts/`、`docs/product/` 和 `docs/architecture/` 为准。

## 1. 目录结构

| 目录 | 内容 |
| --- | --- |
| `project/` | 工程结构、旧文档合并稿和冲突裁决。 |
| `product/` | 旧 PRD、设计稿、API/DB 草案和模块规格。 |
| `agent/` | Agent Runtime 详细设计、Prompt/A2UI 生成指南和上下文编排。 |
| `backend/` | Backend 实施说明和实现细节。 |
| `frontend/` | Frontend 工作台实施说明和实现细节。 |
| `renderer/` | Renderer、A2UI 协议和 Basic Catalog 详细资料。 |
| `shared/` | Shared 类型旧规格。 |
| `integration/` | 端到端集成细节。 |

## 2. 使用规则

- 需要了解模块当前定位时，先读 `docs/modules/*.md`。
- 需要查详细历史设计或迁移依据时，再进入本目录对应模块文件夹。
- 发现归档内容与当前契约冲突时，优先更新 `project/conflicts.md`，再由维护者决定是否迁移到权威文档。
- 归档路径按模块编排，不再按日期批次编排。
- 已过时的旧任务清单不进入归档；当前任务只维护在 `docs/tasks/current.md`。
