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

**Agent Workflow**:
由后端约束、Agent 参与决策和执行的多阶段任务流程。一个 session 可以保留多次 workflow 历史，但同一时刻只能有一个进行中的 workflow。

**Workflow Step**:
Agent Workflow 中一个可观察、可恢复、可失败重试的阶段。

**Workflow Artifact**:
Agent Workflow 中产生的可恢复过程产物，例如澄清表单、Markdown 方案、候选 A2UI messages 或校验报告。

**Candidate A2UI**:
Agent 生成并通过校验、可用于预览但尚未提交为正式 A2UI event 的候选结果。用户确认后，后端才将它提交为正式 A2UI 状态。

**Clarification Form**:
Agent 为补齐 A2UI 生成所需信息而产生的结构化追问表单。前端用下拉、单选、多选、输入框或文本域承载用户回答。

**Backend Tool**:
后端暴露给 Agent Workflow 的受控能力入口。它由后端约束权限、校验输入并记录调用过程。
