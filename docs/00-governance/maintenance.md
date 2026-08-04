# 文档维护规则

本文档定义修改代码、产品、契约、设计或交付任务时应同步维护哪些文档。

## 1. 更新顺序

1. 判断变更事实属于产品、设计、契约、实现、交付还是笔记。
2. 先更新唯一权威位置。
3. 再更新引用该事实的索引、阅读路径、模块说明或任务结果。
4. 如果只是帮助理解，写入 `90-notes/`，不要放入权威目录。

## 2. 变更类型与必改文档

| 变更类型 | 必须更新 |
| --- | --- |
| 产品能力、用户场景、非目标变化 | `10-product/`、必要时更新 `20-design/` 和 `CHANGELOG.md` |
| 架构方案、模块目标职责、技术取舍变化 | `20-design/`，重大决策写入 `20-design/decisions/` |
| API、SSE 或跨模块事件变化 | `30-contracts/api.md` 或 `30-contracts/sse.md`，并更新相关实现文档 |
| DB schema 或事务边界变化 | `30-contracts/db-schema.md`、`40-implementation/modules/backend/README.md` |
| A2UI 协议或 Basic Catalog 合法字段变化 | `30-contracts/a2ui-v0.9.md`、Agent/Renderer 实现文档 |
| Shared 类型变化 | `30-contracts/shared-types.md`、受影响模块实现文档 |
| 模块内部真实逻辑或代码结构变化 | `40-implementation/modules/<module>/README.md` |
| 开发命令、环境变量、运行方式变化 | `50-delivery/operations/` |
| 功能新增、功能修改、重构或修复启动 | `50-delivery/planning/<YYYY-MM-topic>/` |
| 功能任务完成 | `50-delivery/planning/<topic>/result.md`，并回填产品、设计、契约或实现文档 |
| 临时调研、代码导读或 AI 总结 | `90-notes/` |

## 3. 模块文档维护要求

当前实现模块文档位于 `40-implementation/modules/<module>/README.md`。每个模块说明至少维护：

- 文档角色、是否真相源、更新触发；
- 当前定位；
- 技术栈；
- 真实职责边界；
- 真实工程结构；
- 关键文件职责；
- 公共 API 或对外入口；
- 核心运行流程；
- 数据流与状态流；
- 与契约的关系；
- 已知差异；
- 测试与验收；
- 维护规则。

目标设计模块文档位于 `20-design/modules/<module>.md` 或 `20-design/modules/<module>/README.md`。它可以描述未实现目标，但必须标注状态。

## 4. 交付任务维护要求

较大的功能新增、功能修改、重构或修复应在 `50-delivery/planning/` 下创建独立目录，建议包含：

```text
50-delivery/planning/
  YYYY-MM-short-topic/
    context.md
    plan.md
    checklist.md
    progress.md
    decisions.md
    result.md
```

`current.md` 只维护活跃任务索引，不承载所有任务细节。

任务完成后：

1. 将稳定产品事实回填到 `10-product/`。
2. 将稳定设计事实回填到 `20-design/`。
3. 将跨模块数据事实回填到 `30-contracts/`。
4. 将真实代码事实回填到 `40-implementation/`。
5. 在 `result.md` 记录交付结果和遗留问题。
6. 必要时更新 `CHANGELOG.md`。

## 5. AI 阅读笔记维护要求

AI 生成的阅读材料默认放入 `90-notes/`。只有满足以下条件，才能提升为权威文档：

1. 用户明确要求提升。
2. 内容已对照源码和现有权威文档校验。
3. 删除与权威文档重复或冲突的事实。
4. 移动到正确权威目录。
5. 更新入口、阅读路径和反向索引。

