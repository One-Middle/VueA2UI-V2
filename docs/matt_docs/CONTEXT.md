# Context

本文档是 Matt 风格 domain glossary，只记录领域词汇、概念边界和命名约定。

## Language

**A2UI**:
Agent 与 UI renderer 之间传递界面结构、数据模型和交互意图的协议。

**Renderer**:
负责消费 A2UI 消息并渲染可交互 UI 的前端运行层。

**Basic Catalog**:
A2UI renderer 支持的一组基础组件能力集合。

**Agent Runtime**:
受控执行 Agent 推理、工具调用、校验和结果返回的运行层。它不直接访问数据库，也不直接提交正式 A2UI 状态。

**Agent Output**:
Agent 或模型运行时产生的原始输出。它不是 API 输出，也不是前端主流程可直接消费的业务结果；必须先经过解析、校验和 WorkflowStageGate 约束。

**Parsed Agent Result**:
Agent Runtime 将 Agent Output 解析、归一化、校验后得到的阶段结果，例如澄清请求、Markdown 方案、Candidate A2UI 或失败原因。WorkflowService 和 API 只消费 Parsed Agent Result，不直接消费 Agent Output。

**API Output**:
后端 API 或 SSE 返回给前端的稳定 DTO。它来自 Parsed Agent Result、workflow persistence 和权限校验后的组合，不等同于 Agent 原始输出。

**AgentTool**:
Agent Runtime 内部暴露给 Agent 调用的受控工具，例如 `askClarification`。AgentTool 调用记录可用于 timeline 披露，但它不是前端 HTTP action。

**WorkflowAction**:
用户或前端通过 API 推进 workflow 的操作，例如确认方案、提交澄清答案、请求修改或确认提交。WorkflowAction 由 WorkflowService 校验和执行，不等同于 AgentTool。

**Agent Workflow**:
由后端约束、Agent 参与决策和执行的多阶段任务流程。一个 session 可以保留多次 workflow 历史，但同一时刻只能有一个进行中的 workflow。

**Workflow Step**:
Agent Workflow 中一个可观察、可恢复、可失败重试的阶段。

**WorkflowStageGate**:
Agent Workflow 中约束单个阶段可执行行为的门禁。它由后端应用，定义某个 Workflow Step 的前置条件、允许输入、允许输出、失败处理和下一步。
_Avoid_: Agent mode

**Workflow Artifact**:
Agent Workflow 中产生的可恢复过程产物，例如澄清表单、Markdown 方案、候选 A2UI messages 或校验报告。

**Candidate A2UI**:
Agent 生成并通过校验、可用于预览但尚未提交为正式 A2UI event 的候选结果。用户确认后，后端才将它提交为正式 A2UI 状态。

**Clarification Form**:
Agent 为补齐 A2UI 生成所需信息而产生的结构化追问表单。前端用下拉、单选、多选、输入框或文本域承载用户回答。

**Backend Tool**:
后端暴露给 Agent Workflow 的受控能力入口。它由后端约束权限、校验输入并记录调用过程。
