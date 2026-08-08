# A2UI Agent 平台文档入口

本文档是 `docs/` 的唯一入口。当前项目采用 Matt-first 文档系统：`matt_docs/` 是 Agent 任务工作的主系统，产品、设计、契约、实现和笔记分层作为开发前基础资料、开发中稳定沉淀和开发者阅读材料。

## 1. 文档结构

```text
docs/
  README.md                         # 文档入口
  CHANGELOG.md                      # 重要功能、契约、文档结构演进记录
  matt_docs/                        # Matt-first Agent 任务工作系统
  10-product/                       # 产品愿景、需求、路线图
  20-design/                        # 模块功能、定位和边界
  30-contracts/                     # 跨模块数据交互真相源
  40-implementation/                # 当前源码真实实现镜像
  90-notes/                         # 学习、解释、调研、历史归档
```

## 2. 分层职责

| 目录 | 回答的问题 | 是否真相源 |
| --- | --- | --- |
| `matt_docs/` | Agent 如何澄清、产出 spec、拆 tickets、记录 ADR 和推进本地 issue。 | 是，Agent 任务工作真相源 |
| `10-product/` | 为什么做、给谁做、做什么、优先级是什么。 | 是，产品真相源 |
| `20-design/` | 每个模块负责什么、不负责什么、与谁交互。 | 是，模块边界真相源；新 ADR 进入 `matt_docs/adr/` |
| `30-contracts/` | API、DB、事件、A2UI、Shared Types 如何稳定交互。 | 是，跨模块契约最高真相源 |
| `40-implementation/` | 当前代码真实实现是什么、入口在哪里、链路怎么走。 | 是，当前实现真相源 |
| `90-notes/` | 学习材料、AI 解释、调研记录、历史归档。 | 否，只辅助理解 |

## 3. 阅读路径

第一次了解项目：

1. [产品需求](./10-product/prd.md)
2. [产品路线图](./10-product/roadmap.md)
3. [模块边界](./20-design/module-boundaries.md)
4. [Matt-first 工作系统](./matt_docs/README.md)

准备开发某个模块：

1. 读 [模块边界](./20-design/module-boundaries.md)，确认模块定位和职责边界。
2. 读 `40-implementation/modules/<module>/README.md`，确认当前真实代码。
3. 涉及跨模块数据时，读 `30-contracts/`。
4. 任务较大时，使用 `matt_docs/scratch/<feature-slug>/spec.md` 和 `issues/` 推进。

修改跨模块交互：

1. 先更新 `30-contracts/`。
2. 再更新受影响的 `40-implementation/`。
3. 如改变长期架构或产品目标，再更新 `20-design/` 或 `10-product/`。
4. 最后更新 `CHANGELOG.md`。

让 Agent 接手任务：

1. [Matt-first 工作系统](./matt_docs/README.md)
2. [Issue tracker 配置](./matt_docs/agents/issue-tracker.md)
3. [领域词汇](./matt_docs/CONTEXT.md)
4. 与任务相关的产品、设计、契约和实现文档

## 4. 四条铁律

1. `10-product/` 和 `20-design/` 可以描述未来，但必须标注状态。
2. `40-implementation/` 只能写源码已经存在的事实，禁止写愿景和推测。
3. 只要字段、事件、消息、表结构或 DTO 跨模块传递，就必须以 `30-contracts/` 为准。
4. `matt_docs/scratch/` 和 `90-notes/` 不能替代长期真相源；任务完成后必须把稳定事实回填到产品、设计、契约或实现文档。

## 5. Agent 规则

项目级 Agent 行为和文档写入规则以 `../.codex/AGENTS.md` 为准。

