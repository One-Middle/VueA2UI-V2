# Workflow Message UI

Status: ready-for-agent

## Problem Statement

当前创作工作台在会话区、Workflow 工作区和组件展示区之间拆成三栏。用户发起一次 Agent Workflow 后，需要在会话消息、WorkflowPanel、右侧预览之间来回切换视线，才能理解 Agent 正在做什么、等待什么确认、产出了哪些 Artifact。

从用户视角看，一次 Workflow 除非被用户拒绝、取消或修改打断，否则它是 Agent 对一次需求的连续执行。`submit_clarification`、`submit_decision` 和确认预览这类 WorkflowAction 是该次 Workflow 内部的交互，不应表现成新的用户聊天输入。当前三栏结构会把一次连续执行拆散，让用户感觉自己在操作一个额外的 Workflow 控制台，而不是在和 Agent 进行一次连贯创作。

用户希望工作区变成两部分：左侧会话区，右侧组件展示区。Workflow 的流程状态在会话区上方用进度条表示；一次 Workflow 的 reasoningSummary、表单、确认、计划摘要、校验摘要和执行状态，聚合成会话流中的一条 AI Workflow Message。

## Solution

将创作工作台从三栏重构为两栏：

- 左侧为会话区，包含 Workflow 进度条、消息流和输入框。
- 右侧为组件展示区，继续承载 A2UI Renderer 预览、component JSON 和 dataModel JSON inspector。

前端将同一 `workflowId` 下的 assistant messages、Workflow Step、Workflow Artifact 和当前等待态聚合成一条 AI Workflow Message。该消息代表一次 Workflow 的连续执行过程。

AI Workflow Message 内部展示：

- reasoningSummary 步骤日志；
- 当前等待中的 Clarification Form 或 Decision Form；
- 用户已提交的补充、确认、修改或拒绝状态，以折叠摘要显示；
- Markdown Plan、Candidate A2UI、Validation Report 的摘要与可展开详情；
- 失败重试入口；
- Workflow 当前状态。

用户点击确认、提交补充信息或提交预览确认时，不在主会话流中新增独立 user bubble；这些 WorkflowAction 作为 AI Workflow Message 内部状态变化显示。只有用户主动发送新的自然语言需求或追加指令，才渲染为新的用户消息。

## User Stories

1. As a creator, I want the workspace to show conversation and component preview as the two primary areas, so that I can focus on intent and result instead of managing a separate Workflow panel.
2. As a creator, I want Workflow status to appear above the conversation, so that I always know whether the Agent is planning, generating, validating, previewing, or committing.
3. As a creator, I want one Agent Workflow to appear as one AI Workflow Message, so that a single request reads as one continuous execution.
4. As a creator, I want Agent reasoningSummary messages to appear as steps inside the AI Workflow Message, so that I can follow what the Agent is doing.
5. As a creator, I want clarification questions to appear inside the AI Workflow Message, so that I answer the Agent in context.
6. As a creator, I want decision forms to appear inside the AI Workflow Message, so that confirming or revising feels like continuing the same task.
7. As a creator, I want clicking confirm to avoid creating a new user chat bubble, so that the conversation remains clean.
8. As a creator, I want submitted clarification answers to be folded into the Workflow Message, so that I can see that I already responded without cluttering the message stream.
9. As a creator, I want submitted decisions to be folded into the Workflow Message, so that confirmation state is visible without becoming a separate conversation turn.
10. As a creator, I want the Markdown Plan to show as a summary by default, so that long plans do not overwhelm the conversation.
11. As a creator, I want to expand the Markdown Plan when needed, so that I can inspect details before confirming or revising.
12. As a creator, I want Candidate A2UI summaries to appear in the Workflow Message, so that I know when a candidate exists and can restore preview when needed.
13. As a creator, I want Validation Reports to show summarized status by default, so that errors are visible without flooding the message.
14. As a creator, I want failed Workflow steps to show a retry action in the Workflow Message, so that recovery is available where the failure is explained.
15. As a frontend developer, I want the component展示区 to keep the renderer preview and JSON inspectors, so that I can debug generated UI without leaving the main workspace.
16. As a frontend developer, I want the right-side component展示区 to remain visible in a left-right structure even on narrow screens, so that the workspace keeps the same mental model.
17. As a frontend developer, I want WorkflowPanel to be decomposed into reusable inline components, so that form and artifact UI can be rendered inside messages without duplicating logic.
18. As a frontend developer, I want the first version to aggregate Workflow data on the frontend by `workflowId`, so that the backend does not need a new mutable “single workflow message” model.
19. As a frontend developer, I want assistant messages associated with the same Workflow to render inside one Workflow Message, so that reasoningSummary output does not create many independent AI bubbles.
20. As a frontend developer, I want ordinary non-workflow messages to keep their current bubble behavior, so that normal chat remains simple.
21. As a frontend developer, I want WorkflowAction-created user messages to be hidden or folded into the Workflow Message, so that confirm and form submit actions do not pollute the main message list.
22. As a frontend developer, I want existing WorkflowAction APIs to keep working, so that this UI change does not rewrite the Workflow backend.

## Implementation Decisions

- The conversation tab will use a two-column layout: conversation area on the left and component display area on the right.
- The layout remains left-right on narrow screens. The first version should avoid horizontal overflow through minimum column widths, controlled overflow, or other layout constraints, but should not collapse into a vertical stack.
- The existing independent Workflow panel will no longer be rendered as the middle workspace column.
- WorkflowPanel should not be deleted in the first version; its behavior should be split into reusable inline components and then removed from the main workspace composition.
- A Workflow progress bar will be rendered at the top of the conversation area.
- The progress bar uses the fixed Workflow Step sequence: Plan, Generate, Validate, Preview, Commit.
- Step status maps to visual state: completed/confirmed means done, running means active, awaiting_confirmation means waiting, failed means error, pending means pending, skipped means skipped.
- The message list will compute display items instead of rendering every message directly.
- Display items include ordinary messages and AI Workflow Messages.
- The first version aggregates by `workflowId` on the frontend.
- Assistant messages with the same `workflowId` render as reasoningSummary steps inside one AI Workflow Message.
- User messages created by WorkflowAction confirmation or form submission do not render as standalone user bubbles in the main message stream.
- WorkflowAction feedback is shown inside the AI Workflow Message as a folded state summary, such as “已提交补充信息” or “已确认方案”.
- Ordinary user-authored natural language messages continue to render as normal user bubbles.
- Clarification Form and Decision Form render inline inside the AI Workflow Message when the latest Workflow Step is waiting for them.
- Markdown Plan, Candidate A2UI, and Validation Report render as artifact summaries with expandable details.
- Plan and Validation Report details are collapsed by default.
- Candidate summary includes enough information to restore the candidate preview using the existing renderer store behavior.
- The right-side PreviewPanel remains the primary component display area.
- The component JSON and dataModel JSON inspectors remain visible by default in the first version.
- The UI should look like an execution conversation, not an admin workflow console. Workflow Message internals should use compact step logs, inline forms, and foldable summaries.
- The first version should not require backend schema changes or a backend-maintained mutable Workflow Message.

## Testing Decisions

- The primary testing seam is the frontend conversation rendering behavior: given workspace messages, workflows, steps, and artifacts, the UI should render ordinary messages and AI Workflow Messages correctly.
- Tests should prefer externally visible behavior over implementation details. They should assert what the user sees: two-column layout, progress states, one Workflow Message per workflow, inline forms, folded action summaries, and artifact summaries.
- Message aggregation logic can be extracted to a pure helper and unit tested with representative messages and workflows.
- Component tests should cover MessageList rendering ordinary messages and Workflow Messages.
- Component tests should cover Clarification Form submission from inside a Workflow Message.
- Component tests should cover Decision Form submission from inside a Workflow Message.
- Component tests should verify WorkflowAction-created user messages are folded or hidden rather than rendered as standalone bubbles.
- Component tests should verify Plan and Validation Report details are collapsed by default and expandable.
- Layout verification should ensure the conversation tab no longer renders the separate WorkflowPanel column.
- Existing workspace store tests are prior art for session, message, Workflow, and SSE state behavior.
- Existing WorkflowPanel behavior is prior art for form submission, decision submission, candidate preview restore, and retry behavior.

## Out of Scope

- Backend-maintained single mutable Workflow Message.
- Backend schema changes for binding artifacts to a specific assistant message.
- Removing the old WorkflowPanel component file entirely.
- Collapsing the workspace into a vertical mobile layout.
- Redesigning the entire sidebar, session history, Skills, Runtime, or import/export tabs.
- Changing WorkflowAction API contracts.
- Changing A2UI Renderer behavior.
- Hiding component/dataModel inspectors by default.
- Full Markdown rendering overhaul beyond what is needed for readable message content and artifact details.

## Further Notes

This spec depends on the recent direction that reasoningSummary becomes user-visible Agent progress text. The UI should treat these assistant messages as part of the Workflow execution block rather than separate chat replies.

The key product decision is that a Workflow is one continuous Agent response to one user request. Confirming a plan or submitting a clarification answer continues that response; it does not create a new user conversation turn unless the user explicitly writes a new natural language instruction.
