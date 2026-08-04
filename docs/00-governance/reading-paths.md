# 阅读路径

本文档按使用场景组织阅读顺序，避免每次都从完整文档树里摸索。

## 1. 第一次了解项目

1. [产品需求](../10-product/prd.md)
2. [产品路线图](../10-product/roadmap.md)
3. [项目概览](../20-design/overview.md)
4. [系统设计](../20-design/system-design.md)
5. [开发说明](../50-delivery/operations/development.md)

## 2. 开发某个模块

1. 目标设计：`../20-design/modules/<module>.md` 或 `../20-design/modules/<module>/README.md`
2. 当前实现：`../40-implementation/modules/<module>/README.md`
3. 相关契约：`../30-contracts/`
4. 当前活跃任务：[../50-delivery/planning/current.md](../50-delivery/planning/current.md)

## 3. 修改 API、DB、A2UI、SSE 或 Shared Types

1. 对应契约文档：`../30-contracts/`
2. 受影响模块当前实现：`../40-implementation/modules/`
3. 交付任务目录：`../50-delivery/planning/<YYYY-MM-topic>/`
4. [更新日志](../CHANGELOG.md)

## 4. 增加或修改功能

1. 产品范围：`../10-product/`
2. 目标设计：`../20-design/`
3. 当前实现：`../40-implementation/`
4. 跨模块契约：`../30-contracts/`
5. 交付任务：`../50-delivery/planning/`

## 5. 排查端到端问题

1. Integration 实现文档：`../40-implementation/modules/integration/README.md`
2. API / SSE 契约：`../30-contracts/api.md`
3. A2UI 契约：`../30-contracts/a2ui-v0.9.md`
4. 相关模块当前实现
5. `../90-notes/` 中的调研笔记

## 6. 让 AI 接手项目

1. [文档分类规则](./taxonomy.md)
2. [文档维护规则](./maintenance.md)
3. [写作规则](./writing-rules.md)
4. [当前活跃任务](../50-delivery/planning/current.md)
5. 与任务相关的产品、设计、契约、实现和交付文档

## 7. 查历史依据

1. 先读当前权威文档。
2. 再查 `../90-notes/archive/`。
3. 如果历史文档与当前文档冲突，以当前权威文档为准。

