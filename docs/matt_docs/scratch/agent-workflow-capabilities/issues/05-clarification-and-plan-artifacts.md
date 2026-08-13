# 05 - Clarification and plan artifacts

**构建内容：** 打通第一段用户可见 workflow loop：理解需求、必要时提出结构化问题，并生成等待确认的 Markdown plan。

**阻塞关系：** 04 - Workflow-aware sendMessage.

**Status:** resolved

- [x] Workflow 可以进入 `understand`、`clarify`、`propose` 和 `confirm_plan` 阶段。
- [x] `clarify` 和 `propose` 阶段通过 WorkflowStageGate 限制 Agent 行为：clarify 只允许 Parsed Agent Result 为 Clarification Form；propose 允许 Agent 调用内部 `askClarification` AgentTool 生成 `clarification_request`，或输出 Markdown plan 生成 `plan_markdown`。
- [x] Clarification Form 必须由真实 Agent run 通过 `askClarification` AgentTool 产生，不允许后端模板 fallback 伪造。
- [x] Clarification Form artifacts 可以包含 `select`、`radio`、`checkbox`、`text`、`textarea` 和额外自然语言说明；每个问题必须包含 `id`、`label`、`type`、`required` 和 `reason`，选择类问题必须包含 `options`。
- [x] 用户对 Clarification Form 的回答会作为用户可见 messages 保存，并关联到它们推进的 workflow step。
- [x] Plan Markdown 必须由真实 Agent run 产生，不允许后端模板 fallback 伪造。
- [x] Plan Markdown artifacts 覆盖页面目标、布局结构、组件清单、Data Model、交互行为、假设和风险；缺少关键标题时，`propose` step 失败并展示失败原因。
- [x] Plan 在 A2UI generation 继续前等待用户确认。
- [x] Plan 未确认前，WorkflowStageGate 不允许进入 A2UI generation。
- [x] 在 `confirm_plan` 阶段，用户可以用自然语言提交修改请求；WorkflowStageGate 会保留旧 plan version，并按修改信息是否充足决定进入 `clarify` 或直接进入新版 `propose`。
- [x] 用户修改请求会创建新的 plan version，而不是覆盖之前的 plan。

## Implementation notes

- `MessageService` 在创建新的 A2UI workflow 后调用 `WorkflowService.startInitialPlanning()`，自动生成 `understand` 后续的 `clarify` 或 `propose`/`confirm_plan` 阶段。
- `WorkflowService.startInitialPlanning()` 会创建 workflow-scoped AgentRun，并把当前 WorkflowStageGate、用户需求、澄清答案、最近消息、current snapshot、enabled skills 和 ready files 传给 Agent Runtime。
- Agent Runtime 返回 Parsed Agent Result 和 debug metadata；WorkflowService 只把 parsed/validated 的 Clarification Form 或 Markdown plan 写入 `workflow_artifacts`。
- `confirm_plan` 阶段的普通自然语言消息会调用 `WorkflowService.requestPlanRevision()`，旧确认 step 标记为 `skipped`，新版 plan 使用新的 `plan_markdown.version` 保存。
- Agent Output 摘要只允许进入 `agent_runs.metadata.rawOutputPreview` 或等价 debug 字段；不进入 `workflow_artifacts.contentText`，也不作为前端主流程状态。
- 如果 Agent run 失败、解析失败或 gate 校验失败，当前 step 标记为 `failed`，记录失败原因并暴露 retry action；不生成模板 plan 或模板 clarification。
