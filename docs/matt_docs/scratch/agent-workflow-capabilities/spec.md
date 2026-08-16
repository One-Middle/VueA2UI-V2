# Agent Workflow Capabilities

## 问题陈述

当前 Agent 路径已经能够生成和提交 A2UI，但用户需要更受控的创建体验：Agent 应该能在信息不足时提出结构化问题，在生成前展示 Markdown plan，在提交前展示已校验 candidate preview，并且只有用户确认后才写入正式 A2UI event 和 surface snapshot。

这套 workflow 不能把 Agent 原始输出当成业务结果。Agent Output 只用于 debug/audit；Agent Runtime 负责解析为 Parsed Agent Result；WorkflowService 负责门禁、持久化和状态推进；API 负责输出稳定 DTO / SSE payload。

## 核心设计

显式 workflow steps 收敛为五个大阶段：

```text
plan -> generate_a2ui -> validate -> preview -> commit
```

`understand`、`clarify`、`propose`、`confirm_plan` 和 `confirm_commit` 不再是显式 Workflow Step。它们的语义分别并入：

- 理解需求、追问、生成 Markdown plan、确认 plan：属于 `plan`。
- 确认 candidate 是否提交：属于 `preview` 的 decision form。
- 正式提交 exact candidate：属于 `commit`。

## Step 与 Stage State

`WorkflowStep.status` 表达通用生命周期：

```text
pending | running | awaiting_confirmation | completed | failed | skipped
```

`WorkflowStep.stageState` 表达领域等待态，是 DB 字段和 DTO 字段，不放入 metadata：

```text
awaiting_clarification
awaiting_plan_confirmation
awaiting_preview_confirmation
null
```

示例：

```text
plan running + stageState null
plan awaiting_confirmation + awaiting_clarification
plan awaiting_confirmation + awaiting_plan_confirmation
preview awaiting_confirmation + awaiting_preview_confirmation
```

## AgentTool 与 WorkflowAction

AgentTool 是 Runtime 内部工具：

```text
askClarification
askUserDecision
getSkillContent
getSkillReferenceContent
getCatalogComponentDetails
validateA2UI
```

WorkflowAction 是前端/用户通过 API 推进 workflow 的动作：

```text
submit_clarification
submit_decision
retry_step
cancel
```

两者不能混用。UI block 的出现由 AgentTool 调用驱动；用户提交 UI block 时使用 WorkflowAction。

## Workflow Artifacts

第一版 artifact kinds：

```text
clarification_form
decision_form
plan_markdown
candidate_a2ui_messages
validation_report
```

`workflow_artifacts` 只保存 parsed/validated 后的稳定结果。raw Agent Output 不进入 artifact content。

## Plan 阶段

`plan` 负责：

- 理解用户需求。
- 必要时调用 `askClarification` 生成 `clarification_form`。
- 接收 `submit_clarification` 后继续运行 Agent。
- 信息足够时生成 `plan_markdown`。
- 同一次 Agent run 中调用 `askUserDecision` 生成 `decision_form`。
- 等待用户 `submit_decision`。
- 用户选择 `confirm` 后完成 plan，进入 `generate_a2ui`。
- 用户选择 `revise` 时必须提供 comment，保留旧 plan，重新运行 plan。
- 用户选择 `reject` 时记录用户 message，但停留在当前 `awaiting_plan_confirmation`。

`plan` 的合法 Parsed Agent Result：

```ts
type PlanResult =
  | { kind: "clarification_request"; form: ClarificationForm }
  | { kind: "plan_markdown"; markdown: string; decisionForm: DecisionForm }
  | { kind: "failure"; reason: string; details?: JsonObject };
```

Markdown plan 必须包含最低标题：

```text
页面目标
视觉效果
页面结构
界面元素
数据语义
交互行为
```

缺少关键标题时，Agent Runtime 会拒绝该 `plan_markdown`，并把失败原因回传给 Agent 修复。不允许后端模板 fallback 伪造 plan 或 clarification form。

## Clarification Form

Clarification Form 由 Agent 调用 `askClarification` 生成，负责收集信息，不负责确认产物。

第一版字段支持：

```text
select
radio
checkbox
text
textarea
```

每个问题必须有 `id`、`label`、`type`、`required` 和 `reason`；选择类问题必须有 `options`。前端可提供自然语言补充栏。

提交：

```ts
{
  action: "submit_clarification",
  artifactId: "clarification_form_artifact_id",
  payload: {
    answers: Record<string, unknown>,
    additionalText?: string
  }
}
```

提交后当前 `plan` step 从 `awaiting_confirmation + awaiting_clarification` 回到 `running`，并重新调用 Agent。

## Decision Form

Decision Form 由 Agent 调用 `askUserDecision` 生成。只有工具实际被调用时，前端才显示这个特殊 UI block。

Decision Form 是 workflow 的一等 UI artifact，不是普通 assistant message 旁边的按钮。第一版只在前端会话流中作为特殊交互 UI 展示。

结构：

```ts
interface DecisionForm {
  title: string;
  prompt: string;
  guidance: string;
  target: "plan_markdown" | "candidate_a2ui_messages";
  targetArtifactId?: string;
  options: Array<{
    value: "confirm" | "revise" | "reject";
    label: string;
  }>;
}
```

同一次 Agent run 生成 `plan_markdown + decision_form` 时，Runtime 还不知道 artifact id。WorkflowService 创建 `plan_markdown` artifact 后，再创建 `decision_form` artifact，并在 decision form 中回填 `targetArtifactId`。

提交：

```ts
{
  action: "submit_decision",
  artifactId: "decision_form_artifact_id",
  payload: {
    selectedOption: "confirm" | "revise" | "reject",
    comment?: string
  }
}
```

规则：

- `confirm` 直接提交，不能带 comment。
- `revise` 必须带 comment。
- `reject` 不需要 comment，只记录用户 message，不推进 workflow。

## Decision Form 与 Tool Call

第一版只保证单向关联：

```text
decision_form artifact -> tool_call
```

`decision_form.metadata` 至少包含：

```ts
{
  source: "askUserDecision",
  agentRunId,
  toolCallId
}
```

前端主流程读 `workflow_artifacts`；timeline/debug 读 `tool_calls`。`tool_call.output.artifactId` 反向索引第一版不要求实现。

## Generate A2UI 阶段

`generate_a2ui` 负责基于已确认 plan 生成 candidate A2UI 的 Parsed Agent Result。它不写 `candidate_a2ui_messages` artifact，也不提交正式 A2UI event / snapshot。

输入包括：

- confirmed `plan_markdown`
- clarification answers
- current snapshot
- enabled skills
- ready files
- recent messages

失败时，`generate_a2ui` step failed，并展示失败原因。

## Validate 阶段

`validate` 负责校验 candidate A2UI。

规则：

- validate 通过后，写 `candidate_a2ui_messages` artifact。
- validate 通过后，写 `validation_report` artifact。
- validate 失败时，只写 `validation_report`，不写 candidate artifact。
- 未通过 validate 的 candidate 不允许进入 preview。

## Preview 阶段

`preview` 展示 validated candidate，并等待 Agent 调用 `askUserDecision` 形成 `decision_form` UI block。

`submit_decision` 结果：

- `confirm`：preview completed，进入 `commit`。
- `revise`：必须带 comment，回到 `plan`，基于旧 plan、candidate、validation 和 comment 开启新一轮 plan。
- `reject`：记录用户 message，停留在 `awaiting_preview_confirmation`。

## Commit 阶段

`commit` 提交 exact stored `candidate_a2ui_messages` artifact：

- 创建正式 A2UI event。
- 计算 current surface snapshot。
- 更新 session current snapshot。
- workflow completed。

确认后后端不得重新生成另一个 candidate。

## SSE 与前端展示

Workflow SSE events：

```text
workflow_started
workflow_step_updated
workflow_artifact_created
workflow_completed
workflow_failed
```

现有 `agent_run_*` events 继续用于模型/runtime 执行过程。Workflow events 表示流程状态，Agent run events 表示 model/runtime 执行。

前端：

- timeline 展示 steps、Agent runs、tool calls、Skill/Reference disclosure、artifact links、failure state 和 retry actions。
- 会话流在 `askClarification` / `askUserDecision` 工具调用产生 artifact 后展示特殊 UI block。
- 主工作区展示 plan、preview 和验证结果等主要产物。

## 测试策略

- `WorkflowService` 测试覆盖 single active workflow、step transitions、stageState、artifact creation、decision submission、retry 和 completion。
- 测试可以 mock `AgentRuntime.runWorkflowTask()` 的 Parsed Agent Result，但生产路径不能模板 fallback。
- 需要证明 Agent Runtime failure / parse failure / gate failure 时 step failed，而不是生成假 plan 或假 clarification。
- 需要证明 `candidate_a2ui_messages` 只在 validate 通过后保存。
- 需要证明 `submit_decision(confirm/revise/reject)` 在 plan 和 preview 的不同 stageState 下推进正确。

## 不在范围内

- Multi-Agent planner/designer/validator 角色拆分。
- 开放式 model-driven backend tool execution。
- 用户直接编辑 A2UI JSON。
- 不经重新生成直接提交旧 candidate versions。
- Artifact size limits 或 retention cleanup。
- Authentication、authorization 或 multi-user collaboration。
