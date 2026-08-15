# Context

本文档是 Matt 风格 domain glossary，只记录领域词汇、概念边界和命名约定。

## Language

**A2UI**:
Agent 与 UI renderer 之间传递界面结构、数据模型和交互意图的协议。

**Renderer**:
负责消费 A2UI messages 并渲染可交互 UI 的前端运行层。

**Basic Catalog**:
A2UI renderer 支持的一组基础组件能力集合。

**Agent Runtime**:
受控执行 Agent 推理、工具调用、解析、校验和结果返回的运行层。它不直接访问数据库，也不直接提交正式 A2UI 状态。

**AgentExecutor**:
执行单次受控 Agent 任务的运行对象。它负责 ReAct 循环、模型动作解析、工具调用、观察结果追加、草稿修复和结构化结果返回；它不是数据库中的 AgentRun 记录，也不负责 Workflow 状态持久化。

**Agent Observation**:
AgentExecutor 循环中由系统产生的观察事实，例如工具结果、解析错误、校验失败或最终草稿校验结果。Observation 只能由系统生成，模型不能伪造或直接输出。

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
