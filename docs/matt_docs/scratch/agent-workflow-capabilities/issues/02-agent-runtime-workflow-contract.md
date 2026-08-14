# 02 - Agent Runtime workflow contract

**构建内容：** 扩展 Agent Runtime 的 workflow task contract，使生产路径能由真实 Agent 生成 clarification、Markdown plan、decision form 和 candidate A2UI，并由 Runtime 解析为 Parsed Agent Result。

**阻塞关系：** 01 - Workflow contract foundation.

**Status:** resolved

## Scope

- 调整 `packages/shared/src/agent.ts` 中的 `AgentWorkflowTaskInput` 和 `ParsedAgentResult`。
- 定义 `ClarificationForm`、`DecisionForm`、`askClarification`、`askUserDecision` 的结构化类型。
- 让 `plan_markdown` parsed result 能携带同一次 Agent run 产生的 `decisionForm`。
- 明确 raw Agent Output 只能进入 debug metadata，例如 `rawOutputPreview`。
- 为不同 workflow step 提供可见 AgentTools 集合的输入能力，供 WorkflowService gate 控制。

## Acceptance Criteria

- [x] `runWorkflowTask()` 接收当前 step、stageState、用户需求、澄清答案、最近消息、current snapshot、enabled skills、ready files、历史 plan/candidate 等上下文。
- [x] `ParsedAgentResult` 至少包含 `clarification_request`、`plan_markdown`、`candidate_a2ui_messages`、`decision_form` 或可嵌入 `decisionForm` 的 plan result、`failure`。
- [x] `askClarification` 支持 `select`、`radio`、`checkbox`、`text`、`textarea`。
- [x] `askUserDecision` 生成三选一 decision form，包含 `title`、`prompt`、`guidance`、`target`、`options`。
- [x] Runtime parser 不要求 Agent 直接输出 API DTO。
- [x] 生产路径没有后端模板 fallback；失败返回 `failure` 或抛出可记录失败原因。
- [x] tool call record 能关联到 workflow run，并提供 `toolCallId` 供后续 artifact metadata 引用。

## Out Of Scope

- 不负责把 parsed result 写入数据库。
- 不负责 workflow 状态推进。
- 不负责前端表单渲染。
