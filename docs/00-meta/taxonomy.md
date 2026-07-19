# 文档分类规则

本文档定义 `docs/` 的分类、权威等级和事实归属。新增或移动文档时，先判断文档属于哪一层，再决定路径。

## 1. 分层模型

| 目录 | 用途 | 权威等级 | 生命周期 |
| --- | --- | --- | --- |
| `00-meta/` | 文档治理规则、阅读路径、维护约定 | 文档治理权威 | 长期维护 |
| `01-product/` | 产品目标、范围、用户故事、非目标、路线图 | 产品权威 | 随产品演进 |
| `02-architecture/` | 项目概览、系统设计、模块边界、架构决策 | 架构权威 | 长期维护 |
| `03-contracts/` | API、DB、A2UI、事件、shared 类型契约 | 强权威 | 必须随实现同步 |
| `04-modules/` | 模块定位、关键类、核心链路、代码结构、能力矩阵 | 模块权威 | 必须随模块变化同步 |
| `05-operations/` | 开发、测试、部署、排障和运行说明 | 运行权威 | 随工程流程变化 |
| `06-planning/` | 平台改造计划、清单、进展、结果和遗留问题 | 计划权威 | 按改造周期维护 |
| `90-notes/` | AI/人工阅读笔记、调研、代码导读、临时总结 | 非权威 | 可删除、再生成或提升 |
| `99-archive/` | 历史文档、旧设计、迁移参考 | 非权威 | 尽量只追加和索引 |

## 2. 事实归属

| 事实类型 | 唯一权威位置 |
| --- | --- |
| 产品范围、用户故事、非目标 | `01-product/prd.md` |
| 产品阶段计划 | `01-product/roadmap.md` |
| 系统边界、模块依赖、端到端链路 | `02-architecture/system-design.md` |
| 架构决策 | `02-architecture/decisions/` |
| HTTP/SSE API | `03-contracts/api.md` |
| 数据库表、字段、事务边界 | `03-contracts/db-schema.md` |
| A2UI 协议、Basic Catalog 合法字段 | `03-contracts/a2ui-v0.9.md` |
| shared 类型契约 | `03-contracts/shared-types.md` |
| 模块内部职责、关键类、核心链路 | `04-modules/<module>.md` |
| Renderer 当前 Basic Catalog 渲染能力 | `04-modules/renderer-basic-catalog-capabilities.md` |
| 开发命令、环境变量、工程约定 | `05-operations/development.md` |
| 平台改造计划和执行记录 | `06-planning/<YYYY-MM-topic>/` |
| 当前活跃计划索引 | `06-planning/current.md` |
| AI 阅读辅助材料 | `90-notes/` |
| 旧设计或历史合并稿 | `99-archive/` |

## 3. 冲突规则

1. `03-contracts/` 优先于模块文档。
2. `02-architecture/` 优先于 `90-notes/` 和 `99-archive/`。
3. `04-modules/` 优先于 `90-notes/` 和 `99-archive/`。
4. 当前权威文档优先于历史归档。
5. 代码可能暴露文档漂移，但不自动成为文档事实；发现漂移后应更新对应权威文档。
6. AI 阅读笔记永远不覆盖权威文档，只能作为理解辅助。

## 4. 命名规则

- 权威文档使用稳定语义命名，如 `api.md`、`db-schema.md`、`system-design.md`、`backend.md`。
- 架构决策使用 `ADR-0001-short-title.md` 格式。
- 平台改造计划目录使用 `YYYY-MM-short-topic` 格式，如 `2026-07-docs-governance-rework`。
- 阅读笔记可以包含日期和主题，如 `renderer-code-walkthrough-2026-07-19.md`。
- 不使用“最终版”“新版”“临时版”等无法长期维护的文件名。
