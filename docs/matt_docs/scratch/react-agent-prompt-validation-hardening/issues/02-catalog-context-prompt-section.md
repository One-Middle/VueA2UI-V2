# 02 - Catalog Context prompt section

**构建内容：** 将 `getCatalogComponentDetails` 获取的组件字段详情从 observation 正文迁移到独立 Catalog Context 分区。

**阻塞关系：** 01 - workflow skill output protocol.

**Status:** completed

## Scope

- 为 workflow runtime 增加已披露组件详情的运行时状态。
- `ToolRegistry.execute("getCatalogComponentDetails")` 记录组件详情到 Catalog Context。
- `ReactPromptComposer` 渲染 `## Catalog Context`，按组件分组展示字段约束。
- Observation 只保留工具执行摘要，不再长期回放大段组件详情。

## Acceptance Criteria

- [x] prompt 中存在独立 `Catalog Context` 分区。
- [x] component detail observation 不再包含完整组件字段大段文本。
- [x] Catalog Context 包含允许字段、必填字段、枚举值和动态绑定形状。
- [x] 重复请求同一组件不会重复注入。
- [x] 单测覆盖组件详情渲染顺序与去重。

## Out Of Scope

- 不改 Basic Catalog schema 本身。
- 不实现通用 prompt 压缩。
