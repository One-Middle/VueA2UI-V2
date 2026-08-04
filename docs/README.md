# A2UI Agent 平台文档入口

本文档是 `docs/` 的唯一入口。当前项目采用面向 AI Coding 的六层文档模型：产品、设计、契约、实现、交付、笔记分层维护，目标是让人和 Agent 都能快速判断“该读哪里、该信哪里、该改哪里”。

## 1. 文档结构

```text
docs/
  README.md                         # 文档入口
  CHANGELOG.md                      # 重要功能、契约、文档结构演进记录
  00-governance/                    # 文档系统治理规则
  10-product/                       # 产品愿景、需求、路线图
  20-design/                        # 架构设计、模块设计、ADR
  30-contracts/                     # 跨模块数据交互真相源
  40-implementation/                # 当前源码真实实现镜像
  50-delivery/                      # 开发交付任务、计划、运行说明
  90-notes/                         # 学习、解释、调研、历史归档
```

## 2. 分层职责

| 目录 | 回答的问题 | 是否真相源 |
| --- | --- | --- |
| `00-governance/` | 文档系统自己如何初始化、分类、阅读和维护。 | 是，文档治理真相源 |
| `10-product/` | 为什么做、给谁做、做什么、优先级是什么。 | 是，产品真相源 |
| `20-design/` | 系统如何设计、模块如何划分、为什么这样设计。 | 是，设计真相源 |
| `30-contracts/` | API、DB、事件、A2UI、Shared Types 如何稳定交互。 | 是，跨模块契约最高真相源 |
| `40-implementation/` | 当前代码真实实现是什么、入口在哪里、链路怎么走。 | 是，当前实现真相源 |
| `50-delivery/` | 某次功能新增、功能修改、重构或修复如何推进。 | 任务期真相源，完成后需回填长期文档 |
| `90-notes/` | 学习材料、AI 解释、调研记录、历史归档。 | 否，只辅助理解 |

## 3. 阅读路径

第一次了解项目：

1. [产品需求](./10-product/prd.md)
2. [产品路线图](./10-product/roadmap.md)
3. [项目概览](./20-design/overview.md)
4. [系统设计](./20-design/system-design.md)
5. [开发说明](./50-delivery/operations/development.md)

准备开发某个模块：

1. 读 `20-design/` 中对应目标设计和模块边界。
2. 读 `40-implementation/modules/<module>/README.md`，确认当前真实代码。
3. 涉及跨模块数据时，读 `30-contracts/`。
4. 任务较大时，在 `50-delivery/planning/` 下创建或更新任务目录。

修改跨模块交互：

1. 先更新 `30-contracts/`。
2. 再更新受影响的 `40-implementation/`。
3. 如改变长期架构或产品目标，再更新 `20-design/` 或 `10-product/`。
4. 最后更新 `CHANGELOG.md`。

让 Agent 接手任务：

1. [文档分类规则](./00-governance/taxonomy.md)
2. [文档维护规则](./00-governance/maintenance.md)
3. [阅读路径](./00-governance/reading-paths.md)
4. 与任务相关的产品、设计、契约、实现和交付文档

## 4. 四条铁律

1. `10-product/` 和 `20-design/` 可以描述未来，但必须标注状态。
2. `40-implementation/` 只能写源码已经存在的事实，禁止写愿景和推测。
3. 只要字段、事件、消息、表结构或 DTO 跨模块传递，就必须以 `30-contracts/` 为准。
4. `50-delivery/` 和 `90-notes/` 不能替代长期真相源；任务完成后必须把稳定事实回填到产品、设计、契约或实现文档。

## 5. 文档治理

- [文档分类规则](./00-governance/taxonomy.md)
- [文档维护规则](./00-governance/maintenance.md)
- [阅读路径](./00-governance/reading-paths.md)
- [写作规则](./00-governance/writing-rules.md)

