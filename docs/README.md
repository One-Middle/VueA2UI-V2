# A2UI Agent 平台文档入口

本文档是 `docs/` 的唯一入口。新的文档结构按“一个事实只有一个权威位置”整理，详细历史文档已按模块归档到 `docs/archive/`，仅作为迁移参考。

## 1. 文档结构

```text
docs/
  README.md                  # 文档入口
  overview.md                # 项目概览、功能地图、MVP 边界
  development.md             # 本地开发、命令、环境和工程约定
  CHANGELOG.md               # 变更记录
  product/
    prd.md                   # 产品需求、用户故事、非目标
    roadmap.md               # 阶段计划和演进方向
  architecture/
    system-design.md         # 系统架构、模块边界、端到端链路
    decisions/               # 架构决策记录
  contracts/
    api.md                   # HTTP/SSE API 契约
    db-schema.md             # 数据库契约
    a2ui-v0.9.md             # A2UI v0.9 与 Basic Catalog 契约
    shared-types.md          # packages/shared 类型契约
  modules/
    frontend.md              # packages/frontend 实现地图
    renderer.md              # packages/renderer 实现地图
    backend.md               # packages/backend 实现地图
    agent.md                 # packages/agent 实现地图
    shared.md                # packages/shared 实现地图
    integration.md           # 跨模块联调说明
  tasks/
    current.md               # 当前任务清单
  archive/
    README.md                # 详细归档入口
    project/                 # 项目级历史资料、合并稿和冲突表
    product/                 # 产品、API、DB 和模块规格旧稿
    agent/                   # Agent Runtime 详细资料
    backend/                 # Backend 详细资料
    frontend/                # Frontend 详细资料
    renderer/                # Renderer 与 A2UI 详细资料
    shared/                  # Shared 类型详细资料
    integration/             # 集成详细资料
```

## 2. 阅读路径

第一次了解项目：

1. [项目概览](./overview.md)
2. [产品需求](./product/prd.md)
3. [系统设计](./architecture/system-design.md)
4. [开发说明](./development.md)

准备开发某个模块：

1. 先读 [系统设计](./architecture/system-design.md) 的模块边界。
2. 再读对应模块文档：`docs/modules/*.md`。
3. 若涉及跨模块数据，查看 `docs/contracts/` 下的契约文档。
4. 最后查看 [当前任务清单](./tasks/current.md)。

排查端到端问题：

1. [集成说明](./modules/integration.md)
2. [API 契约](./contracts/api.md)
3. [A2UI 契约](./contracts/a2ui-v0.9.md)
4. 对应模块实现文档

## 3. 权威来源规则

- 产品范围只维护在 [产品需求](./product/prd.md)。
- 系统架构、模块依赖和职责边界只维护在 [系统设计](./architecture/system-design.md)。
- HTTP/SSE 接口只维护在 [API 契约](./contracts/api.md)。
- 数据库表、字段、事务边界只维护在 [数据库契约](./contracts/db-schema.md)。
- A2UI 协议、消息顺序和 Basic Catalog 只维护在 [A2UI 契约](./contracts/a2ui-v0.9.md)。
- Renderer 对 Basic Catalog 字段的实际渲染支持程度维护在 [Renderer Basic Catalog 能力矩阵](./archive/renderer/basic-catalog-capabilities.md)，由 [Renderer 模块总领](./modules/renderer.md) 索引。
- 代码目录、文件作用和模块内部流程只维护在 `docs/modules/*.md`。
- 当前开发任务只维护在 [当前任务清单](./tasks/current.md)。

## 4. 维护约定

- 所有项目文档必须使用中文。
- 新增产品能力时，先更新 PRD，再更新架构、契约和相关模块文档。
- 修改 API、DB、A2UI 或 shared 类型时，必须同步更新 `docs/contracts/`。
- 修改模块功能逻辑时，必须同步更新对应 `docs/modules/*.md`。
- 设计功能逻辑发生变化时，必须更新 [CHANGELOG](./CHANGELOG.md)，并记录日期。
- `docs/archive/` 中的详细文档不作为当前实现契约；归档内的 `project/consolidated.md` 只作历史合并索引，`project/conflicts.md` 只记录冲突裁决和待迁移差异。
