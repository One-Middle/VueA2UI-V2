# 03 - Prompt composer contract

**构建内容：** 新增 ReAct prompt composer，固定 system prompt 边界，并按每轮 working context 生成 user prompt。

**阻塞关系：** 02 - Runtime types and action parser.

**Status:** planned

## Scope

- 新增 `packages/agent/src/runtime/react-prompt-composer.ts`。
- system prompt 覆盖身份、权限边界、Workflow 契约、ReAct 循环、JSON 输出协议、工具使用策略、质量门禁、A2UI 约束、修复规则和上下文优先级。
- user prompt 包含 `goal`、`facts`、`observations`、`currentDraft`、`capabilities` 和本轮输出提醒。
- 每轮完整发送当前 working context。
- system prompt 不注入大段 workflow facts。
- 明确 LLM 不能输出 observation，不能输出隐藏推理过程，只能输出 `reasoningSummary`。

## Acceptance Criteria

- [ ] composer 能输出 `{ role: "system" }` 和 `{ role: "user" }` 两类消息。
- [ ] 输出协议在 prompt 中明确要求单个 JSON object。
- [ ] allowed tools 和 expected final kind 能动态注入。
- [ ] observation 只能由系统产生的规则写入 prompt。
- [ ] prompt composer 不读取数据库、不执行工具。

## Out Of Scope

- 不做 prompt 压缩。
- 不做模型调用。
- 不调优最终文案质量。

