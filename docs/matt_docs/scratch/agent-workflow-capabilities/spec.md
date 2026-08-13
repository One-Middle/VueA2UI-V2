# Agent Workflow Capabilities

## 问题陈述

当前 Agent 路径基本表现为一个受控 A2UI 生成器：用户发送消息，后端启动一次 Agent run，Agent 返回文本或已校验的 A2UI messages，后端把成功的 A2UI 输出提交为 events 和 snapshots。

用户想要更强的 A2UI 创建体验。Agent 应该在需求缺失时追问，展示完整 Markdown 方案，生成可预览的候选 A2UI 结果，在前端暴露工作流和工具使用情况，并且只有在用户确认预览结果后才提交。Session history 也需要恢复完整 workflow timeline，而不仅仅是 messages 和当前 snapshot。

## 解决方案

在现有 Agent Runtime 和后端 commit boundary 外引入 Agent Workflow 层。

Session 仍然是最大的创建上下文。一个 session 可以包含多段 workflow 历史，但同一时刻只能有一个 active workflow。每个 workflow 可以包含多个 Agent runs、steps、artifacts 和用户可见 messages。Workflow state 显示在前端 timeline 中，主工作区显示 clarification forms、Markdown plans、candidate previews 和确认操作。

严格区分 Agent 和 API：Agent Output 是 Agent 或模型产生的原始输出，不直接进入前端主流程；Agent Runtime 负责把它解析为 Parsed Agent Result；WorkflowService 再结合 WorkflowStageGate、persistence 和权限边界生成 API Output。前端、workflow artifacts 和业务提交逻辑只消费 parsed/validated 后的结果。

已提交 A2UI 的边界保持不变：只有用户确认过、并通过校验的 candidate A2UI messages 才会提交为 A2UI events，并物化为 surface snapshots。

## 用户故事

1. 作为前端开发者，我希望 Agent 只在关键 A2UI 生成信息缺失时提出结构化追问，从而无需每次都填写长问卷也能补齐需求。
2. 作为创建 A2UI 页面的用户，我希望在生成前审阅完整 Markdown 方案，从而确认页面目标、布局、组件、data model、交互、假设和风险。
3. 作为审阅生成 UI 的用户，我希望在它成为正式 session state 前预览已校验的 candidate A2UI 结果，从而避免被拒绝的版本污染正式 snapshots 或 exports。
4. 作为前端开发者，我希望看到 workflow steps、Agent runs、tool calls、Skill disclosure、Reference disclosure、validation、repair 和 failure details，从而理解 Agent 如何得到结果。
5. 作为回访用户，我希望重新打开 session 时恢复完整 workflow timeline，从而看到之前的 plans、confirmations、candidate versions、failures、retries 和 commits。
6. 作为迭代 plan 或 preview 的用户，我希望自然语言修改请求生成新版本，而不是覆盖历史，从而追踪结果如何变化。

## 实现决策

- `Session` 是最大的结构。它拥有 messages、files、skills、workflow history、Agent runs、A2UI events 和 surface snapshots。
- 一个 session 可以随时间启动多个 workflows，但同一时刻最多只能有一个 workflow 处于 active、running、awaiting confirmation 或 retryable 状态。
- 一个 workflow 可以包含多个 Agent runs。Agent runs 应能关联到 workflow，并在相关时关联到触发它们的 workflow step。
- 第一版 workflow steps 为 `understand`、`clarify`、`propose`、`confirm_plan`、`generate_a2ui`、`validate`、`preview`、`confirm_commit` 和 `commit`。
- 每个 workflow step 由 WorkflowStageGate 约束。Gate 由后端 WorkflowService 应用，定义该阶段的前置条件、允许输入、允许输出、失败处理和下一步。
- Agent Runtime 不决定自己处于哪个阶段，也不决定能做什么；WorkflowService 通过当前 WorkflowStageGate 构造受限任务并校验输出。
- Agent Runtime 返回 Parsed Agent Result 和调试 metadata。业务流程只读取 Parsed Agent Result；Agent Output 摘要只允许进入 `agent_runs.metadata.rawOutputPreview` 或等价 debug 字段，不进入 `workflow_artifacts.contentText`。
- Agent 产物必须来自真实 Agent run。生产流程不使用后端模板 fallback 伪造 Markdown plan 或 Clarification Form；如果 Agent run 失败、解析失败或 gate 校验失败，对应 step 进入 failed，并向前端展示失败原因。
- 自动化测试可以 mock Agent Runtime 的 Parsed Agent Result，用于验证 workflow transition、persistence 和前端恢复；mock 不是产品 fallback，也不代表生产环境允许跳过真实 Agent 生成。
- 用户输入遵循“自由输入，受控提交”原则：确认阶段允许用户用自然语言提出修改、补充或回退请求；WorkflowStageGate 只阻止违法、越权、绕过确认或破坏 A2UI 契约的操作。
- 在 `confirm_plan`、`preview` 和 `confirm_commit` 等确认阶段，自然语言修改是一等入口。Gate 应保存用户修改 message，保留旧 artifact，并按信息是否充足决定进入新版 `clarify`、`propose` 或 candidate regeneration。
- `clarify` gate 只允许 Parsed Agent Result 为 Clarification Form，不允许输出 A2UI messages。
- `propose` gate 允许 Agent 在信息不足时调用内部 `askClarification` AgentTool，解析后生成 `clarification_request` 并进入 `clarify`；信息充足时输出 Markdown plan，解析后生成 `plan_markdown` 并进入 `confirm_plan`。两种结果都不允许输出 A2UI messages。
- `generate_a2ui` gate 必须以已确认 plan 为前置条件，只允许产出 candidate A2UI messages，不允许直接提交正式 A2UI state。
- `confirm_commit` gate 必须以已校验并可预览的 Candidate A2UI 为前置条件，只允许提交 exact stored candidate artifact。
- Step statuses 为 `pending`、`running`、`awaiting_confirmation`、`confirmed`、`completed`、`failed` 和 `skipped`。Retry state 通过 attempt counts 和 failure metadata 表达，而不是单独使用 `retrying` 状态。
- 增加 workflow instances 和 workflow steps 的 workflow-level persistence。
- 增加 `workflow_artifacts` 作为过程 artifact store。Artifacts 包括 `clarification_form`、`plan_markdown`、`candidate_a2ui_messages` 和 `validation_report`。
- Skill usage 与 Skill/Reference disclosure 不是 workflow artifacts。它们保留为 tool call records，并在 workflow timeline 中展示。
- `messages` 只存储用户可见的对话内容：用户需求、Agent questions、Markdown plans、用户确认和用户修改请求。内部 steps 和低层 tool calls 不创建 chat messages。
- Agent 通过 Runtime 内部 `askClarification` AgentTool 生成 Clarification Form。第一版字段集支持 `select`、`radio`、`checkbox`、`text` 和 `textarea`；每个问题必须包含 `id`、`label`、`type`、`required` 和 `reason`，选择类问题必须包含 `options`，前端额外提供自然语言输入用于补充说明。
- Agent 将 plans 生成为 Markdown，供前端直接展示。完整 plan 必须包含页面目标、布局结构、组件清单、Data Model、交互行为、假设和风险等最低标题；缺少关键标题时，`propose` step 失败并展示校验原因。
- Candidate A2UI 存储为 `candidate_a2ui_messages`，而不是 draft snapshot。Candidate A2UI 必须先通过 `validateA2UI`，前端才能预览。
- Preview data 从最新相关 candidate A2UI artifact 恢复：把这些 messages 喂给 Renderer。正式 `surface_snapshots` 仍只保留给已提交的 A2UI events。
- 用户确认会提交被确认的 exact candidate A2UI artifact。确认后，后端不得重新生成一个不同结果。
- 用户修改会创建新版本。下一次生成 prompt 包含上一个 Markdown plan、上一个 candidate A2UI messages、用户最新修改请求和必要的近期 session context。
- 用户修改不会覆盖历史，也不回写旧 step；workflow 会追加 revision loop，用新 step 和新 artifact version 表示新版需求、plan 或 candidate。
- 保留旧 candidate versions。第一版 rollback 不直接提交旧 candidate；可以从旧版本重新生成一个新 candidate。
- 增加 workflow SSE events：`workflow_started`、`workflow_step_updated`、`workflow_artifact_created`、`workflow_completed` 和 `workflow_failed`。
- 现有 `agent_run_*` SSE events 仍用于模型执行。Workflow events 表示过程状态；Agent run events 表示 model/runtime 执行。
- 前端 timeline 展示 workflow steps、Agent runs、tool calls 和 Skill/Reference disclosure。Tool call details 默认应折叠。
- 前端主工作区展示 clarification forms、Markdown plans、candidate previews，以及确认或修改操作。Runtime 或 timeline panels 展示详细过程和调试信息。
- `sendMessage` 仍是用户消息入口，但变为 workflow-aware。它保存用户 message，检查 active workflow，存在时推进当前 workflow；否则使用 intent detection 启动 A2UI workflow，或处理轻量非 workflow 文本响应。
- Failure retry 优先只使用已有 context 重新运行失败 step，而不是从头重启 clarification 和 plan confirmation。

## 测试决策

- 最有价值的后端测试边界是 `WorkflowService`：它应证明一个 session 可以随时间拥有多个 workflows，同一时刻只有一个 active workflow，并且单个 workflow 可以包含多个 Agent runs、steps、artifacts、confirmations、retries 和 completion。
- 后端测试应验证 candidate A2UI 在 `confirm_commit` 前不会创建 A2UI events 或 surface snapshots。
- 后端测试应验证确认 candidate 会通过现有 validation 和 transaction boundary 提交 exact stored candidate artifact。
- 后端测试应验证 candidate generation 或 validation 失败时，会记录 failed step 和 validation report，且不更新正式 Renderer state。
- 后端测试应验证 `sendMessage` 能把 ordinary messages 与 A2UI generation 或 modification intents 分流。
- 前端测试应验证 workflow timeline 能渲染 steps、Agent runs、tool calls、Skill/Reference disclosure、artifact links、failure state 和 retry actions。
- 前端测试应验证 Clarification Form 字段支持 select、radio、checkbox、text、textarea 和额外自然语言说明。
- 后端测试应验证生产路径不会用后端模板 fallback 生成 plan 或 clarification；测试 mock 只替代外部 Agent Runtime 返回，用于断言 Parsed Agent Result 被正确解析、持久化和推进 workflow。
- Integration tests 应覆盖从用户需求到 plan confirmation、candidate preview、commit confirmation、A2UI event creation、current snapshot creation，以及 session reload 后 timeline recovery 的完整路径。

相似的现有边界包括后端 Agent run commit tests、snapshot service tests、SSE event handling，以及围绕 messages、Agent runs、A2UI events 和 surface snapshots 的前端 workspace store hydration。

## 不在范围内

- Multi-Agent planner/designer/validator 角色拆分。
- 开放式 model-driven backend tool execution。
- 用户在 preview confirmation 前直接编辑 A2UI JSON。
- 不经重新生成直接提交旧 candidate versions。
- 持久化本地 preview interactions 产生的 Renderer runtime state。
- Artifact size limits 或 retention cleanup。
- Authentication、authorization 或 multi-user collaboration。
- 创建 implementation tickets；这属于后续 ticketing step。

## 补充说明

- 现有 A2UI event 和 surface snapshot 语义应保持权威：正式 snapshots 只从已提交 A2UI events 物化。
- 新 workflow layer 应包装现有 Agent Runtime 和 commit boundary，而不是整体重写它们。
- 本 spec 使用 glossary 术语 Agent Runtime、Agent Output、Parsed Agent Result、API Output、AgentTool、WorkflowAction、Agent Workflow、Workflow Step、WorkflowStageGate、Workflow Artifact、Candidate A2UI、Clarification Form 和 Backend Tool。
