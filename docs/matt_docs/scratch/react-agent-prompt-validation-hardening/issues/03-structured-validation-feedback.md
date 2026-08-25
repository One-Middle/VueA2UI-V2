# 03 - Structured validation feedback

**构建内容：** 让 `validateA2UI` 失败反馈更适合模型修复当前 draft。

**阻塞关系：** 02 - Catalog Context prompt section.

**Status:** completed

## Scope

- 保留原有 `ValidationIssue` 兼容字段。
- 在 Agent 内部 observation details 中补充结构化诊断。
- 对 `additionalProperties` 明确多余字段名。
- 对 `oneOf` / 类型错误补充期望形状和实际值摘要。
- 对常见组件字段混淆提供修复提示，例如 `TextField.value -> TextField.text`。

## Acceptance Criteria

- [x] `additionalProperties` 错误能显示 `componentId`、`component` 和 `extraProperty`。
- [x] `Text.text` 类型错误能提示合法形状。
- [x] `TextField` / `CheckBox` 常见字段混淆有 repair hint。
- [x] trace human summary 保持简短，prompt observation details 保持可修复。
- [x] 单测覆盖用户日志中的错误形态。

## Out Of Scope

- 不引入自动 JSON patch 修改模型草稿。
- 不改变 `validateA2UI` 的通过/失败语义。
