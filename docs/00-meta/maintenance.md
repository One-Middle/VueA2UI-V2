# 文档维护规则

本文档定义修改代码、产品、契约或计划时应同步维护哪些文档。

## 1. 更新顺序

1. 先判断变更事实归属。
2. 先更新唯一权威位置。
3. 再更新引用该事实的模块说明、阅读路径或计划记录。
4. 如果只是帮助理解，写入 `90-notes/`，不要放入权威目录。

## 2. 变更类型与文档

| 变更类型 | 必须更新 |
| --- | --- |
| 产品能力变化 | `01-product/prd.md`、`02-architecture/system-design.md`、相关 `04-modules/`、`CHANGELOG.md` |
| API 或 SSE 变化 | `03-contracts/api.md`、相关前后端模块说明 |
| DB schema 或事务边界变化 | `03-contracts/db-schema.md`、`04-modules/backend/README.md` |
| A2UI 协议或 Basic Catalog 合法字段变化 | `03-contracts/a2ui-v0.9.md`、`04-modules/renderer/README.md`、`04-modules/agent/README.md` |
| shared 类型变化 | `03-contracts/shared-types.md`、受影响模块说明 |
| 模块内部逻辑变化 | `04-modules/<module>/README.md` |
| 开发命令或工程结构变化 | `05-operations/development.md` |
| 平台改造启动、推进或完成 | `06-planning/<计划目录>/`、`06-planning/current.md` |
| 临时调研、代码导读或 AI 总结 | `90-notes/` |
| 旧资料保留 | `99-archive/` |

## 3. 模块文档维护要求

模块文档不能只列目录。每个模块说明至少应维护：

- 模块定位；
- 输入与输出；
- 职责边界；
- 关键类、核心对象或关键文件；
- 核心逻辑链路；
- 与其他模块的关系；
- 依赖契约；
- 测试与验收；
- 维护规则；
- 相关阅读笔记索引。

## 4. 计划文档维护要求

较大的平台改造必须在 `06-planning/` 下创建独立目录，建议包含：

```text
06-planning/
  YYYY-MM-short-topic/
    context.md
    plan.md
    checklist.md
    progress.md
    decisions.md
    result.md
```

`current.md` 只维护活跃计划索引，不承载所有任务细节。

计划完成后保留 `result.md`，并把长期事实迁移到产品、架构、契约或模块文档。

## 5. AI 阅读笔记维护要求

AI 生成的阅读材料默认放入 `90-notes/`。只有满足以下条件，才能提升为权威文档：

1. 用户明确要求提升。
2. 内容已对照代码和现有权威文档校验。
3. 删除与权威文档重复或冲突的事实。
4. 移动到正确权威目录。
5. 更新入口、阅读路径和反向索引。
