# 03 - Plan stage state machine

**构建内容：** 将 workflow 前半段收敛为单一 `plan` step。Agent 在该阶段理解需求，必要时提问，信息足够时生成 Markdown plan 和 decision form。

**阻塞关系：** 01 - Workflow contract foundation, 02 - Agent Runtime workflow contract.

**Status:** resolved

## Scope

- 移除 `understand`、`clarify`、`propose`、`confirm_plan` 作为显式 step 的生产路径。
- `startInitialPlanning()` 创建并运行 `plan` step。
- WorkflowService gate 只消费 Parsed Agent Result。
- `clarification_request` 写入 `clarification_form` artifact，并将 plan step 置为 `awaiting_confirmation + awaiting_clarification`。
- `plan_markdown + decision_form` 写入 `plan_markdown` 和 `decision_form` artifacts，并将 plan step 置为 `awaiting_confirmation + awaiting_plan_confirmation`。
- Markdown plan 必须通过最低标题校验。

## Acceptance Criteria

- [x] 新 workflow 启动后第一个 step 是 `plan`。
- [x] Agent 请求澄清时不创建独立 `clarify` step。
- [x] Agent 输出 plan 时不创建独立 `confirm_plan` step。
- [x] `plan` 阶段不允许生成或保存 A2UI messages。
- [x] `plan_markdown` 必须包含：页面目标、布局结构、组件清单、Data Model、交互行为、假设、风险。
- [x] 如果 Agent 未调用 `askUserDecision`，plan step 不能进入 `awaiting_plan_confirmation`。
- [x] Agent failure、parse failure 或 gate violation 会让当前 step failed，并展示失败原因。

## Out Of Scope

- 不实现 `submit_decision` 推进。
- 不实现 generate/validate/preview/commit。
