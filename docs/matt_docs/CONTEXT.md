# Context

本文档是 Matt 风格 domain glossary，只记录领域词汇、概念边界和命名约定。

## Language

**A2UI**:
Agent 与 UI renderer 之间传递界面结构、数据模型和交互意图的协议。

**Renderer**:
负责消费 A2UI messages 并渲染可交互 UI 的前端运行层。

**Basic Catalog**:
A2UI renderer 支持的一组基础组件能力集合。

**Basic Catalog Definition**:
Basic Catalog 的单一 TypeScript 事实源，描述当前正式支持的组件集合、字段 schema、字段语义以及字段到普通组件 props/events/slots 的映射。它同时约束 Agent 可生成内容、Validator 可通过内容、Renderer 可渲染内容和 Docs 应记录内容。

**Plain UI Component**:
不感知 A2UI 协议的普通 Vue 组件。它只接收 Vue props、Vue slots，并 emit 普通事件；不得依赖 `ComponentModel`、`DataContext`、`componentContextKey`、`A2uiComponent`、A2UI `action` 或 `{ path }` binding。

**RenderNode**:
Renderer 内部的 A2UI 协议解析结果，用于连接 `ComponentModel` 和 Vue VNode。RenderNode 不是公开协议，也不是跨端 UI DSL；它记录普通组件类型、props、事件意图、内容区域和最小 meta。

**RenderNode Meta**:
RenderNode 上用于 Renderer 内部诊断和协议处理的最小上下文，包含 `surfaceId`、`componentId` 和 `basePath`。Meta 不透传给普通 UI 组件。

**RenderNode Slot**:
RenderNode 内部的内容区域模型，不等同于 Vue runtime slot。Vue renderer 负责把 RenderNode slot 翻译成真实 Vue slot，例如 default 内容、Tabs panels 内容或其他结构化内容区域。

**Dependency-collected Tree Rebuild**:
Renderer 构建 RenderNode tree 时收集实际读取的 dataModel 路径和 script deps，并在 surface 层订阅这些路径；依赖变化后重建整棵 RenderNode tree。它用细粒度依赖控制刷新触发，但不在第一版引入每节点独立生命周期。

**Agent Runtime**:
受控执行 Agent 推理、工具调用、解析、校验和结果返回的运行层。它不直接访问数据库，也不直接提交正式 A2UI 状态。

**AgentExecutor**:
执行单次受控 Agent 任务的运行对象。它负责 ReAct 循环、模型动作解析、工具调用、观察结果追加、草稿修复和结构化结果返回；它不是数据库中的 AgentRun 记录，也不负责 Workflow 状态持久化。

**Agent Observation**:
AgentExecutor 循环中由系统产生的观察事实，例如工具结果、解析错误、校验失败或最终草稿校验结果。Observation 只能由系统生成，模型不能伪造或直接输出。

**Resource Ledger**:
Agent Workflow 中跨 task 共享的结构化资源账本，记录 Agent Runtime 已披露给模型的 Skill 和 Skill Reference。它表示当前 workflow 已掌握什么资源，不等同于 trace，也不直接记录工具事件。

**Resource Ledger Snapshot**:
Resource Ledger 的可持久化 JSON 快照，存放在 AgentWorkflow metadata 中。Snapshot 只保存 resource key 和元信息，不保存 Skill 或 Skill Reference 正文；下一次 Workflow task 运行前由 Agent Runtime 重新补全正文。

**Working Resources**:
PromptComposer 从 Resource Ledger 注入本轮 prompt 的已获取资源分区。它包含已披露 Skill 和 Skill Reference 的正文，供模型直接使用，避免从 Agent Observation 历史中重复展开大块内容。

**Hydration**:
Agent Runtime 根据 Resource Ledger Snapshot 和当前 enabledSkills 重新恢复运行时 Resource Ledger 的过程。Hydration 找不到的资源会被静默丢弃并记录到 debug metadata，不作为 Agent Observation 注入模型。

**Agent Trace Event**:
AgentExecutor 在单次运行过程中产生的脱敏进度事件，用于展示 iteration、reasoningSummary、tool call、observation 和 final validation 摘要。它服务于实时调试和恢复，不等同于完整模型输入输出日志。

**Agent Output**:
Agent 或模型运行时产生的原始输出。它不是 API 输出，也不是前端主流程可直接消费的业务结果；必须先经过解析、归一化、校验和 WorkflowStageGate 约束。

**Parsed Agent Result**:
Agent Runtime 将 Agent Output 解析、归一化、校验后得到的阶段结果，例如 clarification request、Markdown plan、candidate A2UI、decision form 或 failure。WorkflowService 和 API 只消费 Parsed Agent Result，不直接消费 Agent Output。

**API Output**:
后端 API 或 SSE 返回给前端的稳定 DTO。它来自 Parsed Agent Result、workflow persistence 和权限/门禁校验后的组合，不等同于 Agent 原始输出。

**AgentTool**:
Agent Runtime 内部暴露给 Agent 调用的受控工具，例如 `askClarification`、`askUserDecision`、`getSkillContent`、`getSkillReferenceContent`、`getCatalogComponentDetails` 和 `validateA2UI`。AgentTool 调用记录可以用于 timeline/debug，但它不是前端 HTTP action。

**WorkflowAction**:
用户或前端通过 API 推进 workflow 的受控操作。第一版包含 `submit_clarification`、`submit_decision`、`retry_step` 和 `cancel`。WorkflowAction 由 WorkflowService 校验和执行，不等同于 AgentTool。

**User Gate**:
Agent Workflow 中必须等待用户动作的边界。第一版包含 clarification、plan confirmation、preview confirmation 和 commit 前确认。Agent 到达 User Gate 后必须持久化可恢复 artifact 并停止等待 WorkflowAction，不能自动越过确认或提交边界。

**Session Resync**:
前端 SSE 重连成功后，从后端 HTTP API 重新同步当前 session 事实源的过程。它用于补齐断线期间漏掉的实时事件，数据来源包括 messages、workflows、agent runs、A2UI events、surface snapshots 和 session detail；它不同于 Agent Runtime 的 Hydration。

**Workflow Interruption**:
用户或运行环境中断当前 AgentRun 后保留 Agent Workflow 上下文的状态。中断后的 workflow 和当前 step 进入 `interrupted`，当前 AgentRun 进入 `cancelled`；用户后续发送非空普通消息时，可以沿原 workflow step 创建新的 AgentRun 继续。

**Agent Workflow**:
由后端约束、Agent 参与生成和判断的多阶段任务流程。一个 session 可以保留多次 workflow 历史，但同一时刻只能有一个进行中的 workflow。

**Workflow Step**:
Agent Workflow 中一个可观察、可恢复、可失败重试的大阶段。第一版显式 step 只有 `plan`、`generate_a2ui`、`validate`、`preview` 和 `commit`。

**Workflow Stage State**:
Workflow Step 的领域子状态，用于表达当前 step 正在等待什么。第一版包含 `awaiting_clarification`、`awaiting_plan_confirmation` 和 `awaiting_preview_confirmation`。它是 DB 字段和 DTO 字段，不放入 metadata。

**WorkflowStageGate**:
约束单个 Workflow Step 可执行行为的门禁。它由 WorkflowService 应用，定义某个 step 的前置条件、可见 AgentTools、允许输入、允许 Parsed Agent Result、失败处理和下一步。

**Workflow Artifact**:
Agent Workflow 中产生的可恢复过程产物，例如 `clarification_form`、`decision_form`、`plan_markdown`、`candidate_a2ui_messages` 或 `validation_report`。

**Clarification Form**:
Agent 通过 `askClarification` 生成的结构化补充信息表单。它负责收集生成 plan 所需的信息，提交动作为 `submit_clarification`。

**Decision Form**:
Agent 通过 `askUserDecision` 生成的特殊 UI 表单。它只在工具被实际调用时显示，用于让用户在 `confirm`、`revise`、`reject` 三个选项中做决策。提交动作为 `submit_decision`。

**Candidate A2UI**:
Agent 生成并通过 `validateA2UI` 校验、可用于预览但尚未提交为正式 A2UI event 的候选结果。`candidate_a2ui_messages` artifact 只在 validate 通过后保存。

**Session**:
A2UI 创建体验的最大上下文。Session 拥有 messages、files、skills、workflow history、Agent runs、A2UI events 和 surface snapshots。

**Backend Tool**:
后端暴露给 Agent Workflow 的受控能力入口。它由后端约束权限、校验输入并记录调用过程。
