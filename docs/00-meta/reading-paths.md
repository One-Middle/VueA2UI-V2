# 阅读路径

本文档按使用场景组织阅读顺序，避免每次都从完整文档树里摸索。

## 1. 第一次了解项目

1. [项目概览](../02-architecture/overview.md)
2. [产品需求](../01-product/prd.md)
3. [系统设计](../02-architecture/system-design.md)
4. [开发说明](../05-operations/development.md)

## 2. 开发某个模块

1. [系统设计](../02-architecture/system-design.md)
2. 对应模块文档：`../04-modules/<module>.md`
3. 相关契约：`../03-contracts/`
4. 当前活跃计划：[../06-planning/current.md](../06-planning/current.md)

## 3. 修改 API、DB、A2UI 或 shared 类型

1. 对应契约文档：`../03-contracts/`
2. 相关模块文档：`../04-modules/`
3. 平台改造计划：`../06-planning/<计划目录>/`
4. [更新日志](../CHANGELOG.md)

## 4. 排查端到端问题

1. [集成说明](../04-modules/integration.md)
2. [API 契约](../03-contracts/api.md)
3. [A2UI 契约](../03-contracts/a2ui-v0.9.md)
4. 相关模块说明
5. `../90-notes/investigations/` 中的调研笔记

## 5. 让 AI 接手项目

1. [文档分类规则](./taxonomy.md)
2. [文档维护规则](./maintenance.md)
3. [当前活跃计划](../06-planning/current.md)
4. 与任务相关的产品、架构、契约和模块文档

## 6. 查历史依据

1. 先读当前权威文档。
2. 再查 [历史归档入口](../99-archive/README.md)。
3. 如果历史文档与当前文档冲突，以当前权威文档为准。
