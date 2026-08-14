# 01 - Workflow contract foundation

**构建内容：** 先落地 Agent Workflow 的 shared contract、DB schema 和 DTO 基础，让后续后端、Agent Runtime 和前端都基于同一套阶段、状态、artifact 和 action 语言实现。

**阻塞关系：** None - can start immediately.

**Status:** resolved

## Scope

- 修改 `packages/shared/src/api.ts` 中的 workflow DTO、step type、stage state、artifact kind、action type 和 action payload。
- 修改 Prisma schema，为 `workflow_steps` 增加 `stage_state` 字段。
- 更新后端 DTO mapper，使 `WorkflowStepDto.stageState` 来自 DB 字段。
- 保留 session 可拥有多次 workflow 历史、同一时刻只允许一个 active workflow 的约束。

## Acceptance Criteria

- [x] `WorkflowStepType` 只包含 `plan`、`generate_a2ui`、`validate`、`preview`、`commit`。
- [x] 新增 `WorkflowStageState`：`awaiting_clarification`、`awaiting_plan_confirmation`、`awaiting_preview_confirmation` 或 `null`。
- [x] `WorkflowStepDto` 暴露 `stageState`，且该字段不是从 `metadata` 推导。
- [x] `WorkflowArtifactKind` 包含 `clarification_form`、`decision_form`、`plan_markdown`、`candidate_a2ui_messages`、`validation_report`。
- [x] `WorkflowActionType` 收敛为 `submit_clarification`、`submit_decision`、`retry_step`、`cancel`。
- [x] `submit_clarification` 和 `submit_decision` 使用独立 typed payload。
- [x] Prisma migration 或 schema change 覆盖 `workflow_steps.stage_state`。
- [x] 现有 DTO / SSE 类型能携带新的 step state，不要求本 ticket 完成完整状态机。

## Out Of Scope

- 不重写 `WorkflowService` 完整流程。
- 不实现 Agent Runtime 的 `askUserDecision`。
- 不实现前端特殊 UI block。
