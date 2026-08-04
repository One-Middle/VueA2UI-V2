# 文档分类规则

本文档定义 `docs/` 的分类、权威等级和事实归属。新增或移动文档时，先判断文档属于哪一层，再决定路径。

## 1. 六层模型

| 目录 | 用途 | 权威等级 | 生命周期 |
| --- | --- | --- | --- |
| `00-governance/` | 文档系统初始化、分类、阅读路径、维护规则和写作规则。 | 文档治理权威 | 长期维护 |
| `10-product/` | 产品愿景、用户需求、功能范围、路线图和非目标。 | 产品权威 | 随产品演进 |
| `20-design/` | 架构设计、模块目标设计、端到端设计和 ADR。 | 设计权威 | 长期维护 |
| `30-contracts/` | API、DB、事件、A2UI、Shared Types 等跨模块数据契约。 | 最高跨模块权威 | 必须随实现同步 |
| `40-implementation/` | 当前源码真实实现镜像：模块结构、入口、流程、状态和测试。 | 当前实现权威 | 必须随代码变化同步 |
| `50-delivery/` | 功能新增、功能修改、重构、修复的任务计划、进展、结果和运行说明。 | 任务期权威 | 按任务周期维护 |
| `90-notes/` | 学习材料、AI 解释、调研记录、代码导读和历史归档。 | 非权威 | 可删除、再生成或提升 |

## 2. 事实归属

| 事实类型 | 唯一权威位置 |
| --- | --- |
| 产品愿景、用户价值、能力范围 | `10-product/` |
| 产品阶段计划 | `10-product/roadmap.md` |
| 系统目标架构、模块目标职责 | `20-design/` |
| 架构决策及取舍原因 | `20-design/decisions/` |
| HTTP API | `30-contracts/api.md` |
| 数据库表、字段、事务边界 | `30-contracts/db-schema.md` |
| A2UI 协议、消息顺序、Basic Catalog 合法字段 | `30-contracts/a2ui-v0.9.md` |
| SSE 或其他跨模块事件 | `30-contracts/sse.md` 或 `30-contracts/api.md` 中的 SSE 章节 |
| Shared 类型契约 | `30-contracts/shared-types.md` |
| 模块真实源码结构、入口、运行链路 | `40-implementation/modules/<module>/README.md` |
| Renderer 当前 Basic Catalog 渲染能力 | `40-implementation/modules/renderer/basic-catalog-capabilities.md` |
| 开发命令、环境变量、运行说明 | `50-delivery/operations/` |
| 当前功能改造计划和执行记录 | `50-delivery/planning/<YYYY-MM-topic>/` |
| 当前活跃任务索引 | `50-delivery/planning/current.md` |
| AI 阅读辅助材料、学习笔记、历史归档 | `90-notes/` |

## 3. 冲突规则

1. `30-contracts/` 优先于所有模块文档。
2. `40-implementation/` 优先于 `20-design/` 判断“当前代码已经做了什么”。
3. `20-design/` 优先于 `90-notes/` 判断“目标架构应该是什么”。
4. `10-product/` 优先于任务计划判断长期产品范围。
5. `50-delivery/` 只在任务执行期作为过程真相源；任务完成后必须回填长期文档。
6. `90-notes/` 永远不覆盖权威文档，只能辅助理解。
7. 代码可能暴露文档漂移；发现漂移后应更新对应权威文档。

## 4. 命名规则

- 权威文档使用稳定语义命名，如 `api.md`、`db-schema.md`、`system-design.md`。
- 架构决策使用 `ADR-0001-short-title.md` 格式。
- 交付任务目录使用 `YYYY-MM-short-topic` 格式，如 `2026-08-docs-governance-rework`。
- 学习笔记可包含日期和主题，如 `renderer-code-walkthrough-2026-08-04.md`。
- 不使用“最终版”“新版”“临时版”等无法长期维护的文件名。

