# A2UI Agent 平台文档入口

本文档是 `docs/` 的唯一入口。文档体系按“权威事实、运行说明、演进计划、阅读笔记、历史归档”分层维护，目标是让人和 AI 都能快速判断：该读哪里、该信哪里、该改哪里。

## 1. 文档结构

```text
docs/
  README.md                       # 文档入口
  CHANGELOG.md                    # 变更记录
  00-meta/                        # 文档治理规则、分类和阅读路径
  01-product/                     # 产品范围、PRD、路线图
  02-architecture/                # 项目概览、系统架构、架构决策
  03-contracts/                   # API、DB、A2UI、shared 类型契约
  04-modules/                     # 各模块说明、关键类、核心链路、能力矩阵
  05-operations/                  # 开发、测试、部署、排障等运行说明
  06-planning/                    # 平台改造计划、执行记录和结果
  90-notes/                       # AI/人工阅读笔记、调研、代码导读
  99-archive/                     # 历史归档，不作为当前契约
```

## 2. 阅读路径

第一次了解项目：

1. [项目概览](./02-architecture/overview.md)
2. [产品需求](./01-product/prd.md)
3. [系统设计](./02-architecture/system-design.md)
4. [开发说明](./05-operations/development.md)

准备开发某个模块：

1. 先读 [系统设计](./02-architecture/system-design.md) 的模块边界。
2. 再读对应模块文档：`docs/04-modules/<module>/README.md`。
3. 若涉及跨模块数据，查看 `docs/03-contracts/` 下的契约文档。
4. 若属于平台改造，查看或创建 `docs/06-planning/<计划目录>/plan.md`。

排查端到端问题：

1. [集成说明](./04-modules/integration/README.md)
2. [API 契约](./03-contracts/api.md)
3. [A2UI 契约](./03-contracts/a2ui-v0.9.md)
4. 对应模块说明和相关 `90-notes/` 调研笔记

让 AI 接手任务：

1. [文档分类规则](./00-meta/taxonomy.md)
2. [文档维护规则](./00-meta/maintenance.md)
3. [当前活跃计划](./06-planning/current.md)
4. 与任务相关的产品、架构、契约和模块文档

## 3. 权威来源规则

- 产品范围只维护在 [产品需求](./01-product/prd.md)。
- 系统架构、模块依赖和职责边界只维护在 [系统设计](./02-architecture/system-design.md)。
- HTTP/SSE 接口只维护在 [API 契约](./03-contracts/api.md)。
- 数据库表、字段、事务边界只维护在 [数据库契约](./03-contracts/db-schema.md)。
- A2UI 协议、消息顺序和 Basic Catalog 合法字段只维护在 [A2UI 契约](./03-contracts/a2ui-v0.9.md)。
- Renderer 对 Basic Catalog 字段的实际渲染支持程度维护在 [Renderer Basic Catalog 能力矩阵](./04-modules/renderer/basic-catalog-capabilities.md)，由 [Renderer 模块说明](./04-modules/renderer/README.md) 索引。
- 代码目录、关键类、核心链路和模块内部流程只维护在 `docs/04-modules/<module>/README.md`。
- 平台改造计划、执行过程和结果维护在 `docs/06-planning/`，其中 `current.md` 只作为活跃计划索引。
- AI 生成的阅读笔记默认放入 `docs/90-notes/`，不作为权威事实来源。
- 历史文档放入 `docs/99-archive/`，不作为当前实现契约。

## 4. 维护约定

- 所有项目文档必须使用中文。
- 新增产品能力时，先更新 PRD，再更新架构、契约和相关模块文档。
- 修改 API、DB、A2UI 或 shared 类型时，必须同步更新 `docs/03-contracts/`。
- 修改模块功能逻辑时，必须同步更新对应 `docs/04-modules/<module>/README.md`，并包含关键类或核心链路变化。
- 每次较大的平台改造应在 `docs/06-planning/` 下创建独立计划目录。
- 临时调研、代码导读、AI 总结默认进入 `docs/90-notes/`，只有经过校对和迁移后才能提升为权威文档。
- 设计功能逻辑发生变化时，必须更新 [CHANGELOG](./CHANGELOG.md)，并记录日期。
- `docs/99-archive/` 中的详细文档仅作为历史参考；发现与当前契约冲突时，以 `01-product/`、`02-architecture/`、`03-contracts/`、`04-modules/` 为准。

## 5. 文档治理

- [文档分类规则](./00-meta/taxonomy.md)
- [文档维护规则](./00-meta/maintenance.md)
- [阅读路径](./00-meta/reading-paths.md)
