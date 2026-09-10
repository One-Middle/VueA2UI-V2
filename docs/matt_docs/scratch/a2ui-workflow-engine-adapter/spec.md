# 平台工作流 Agent Host Adapter

## 目标

将现有 workflow 业务投影为 SPI 请求和宿主能力，使业务平台只依赖 Agent Engine SPI。

## 范围

- 将 `AgentWorkflowTaskInput` 投影为通用任务说明、outputSchema、contextCatalog、capabilityCatalog 和预算。
- 实现 `AgentEngineHost` 的上下文材料、能力调用、事件桥接和取消观察。
- 将通用 JSON output 校验并映射为 `ParsedAgentResult` 和 `AgentWorkflowTaskResult`。
- 持久化 contextUsed、通用事件、失败结果和不透明 continuation。

## 业务职责

平台保留 workflow 状态、工件、用户表单、A2UI 权威校验、candidate freshness、SSE、持久化和 task 重试。平台不理解引擎内部线程、SDK item、模型配置或 CLI。

## 全量接管流程

Codex、ReAct 或任意 workflow-v1 引擎可以分别输出 clarification、plan、decision、candidate 或 context_insufficient 的结构化结果。平台根据 task outputSchema 和权威校验推进等待态、修订路径或提交。

## 验收标准

- workflow 服务只通过 `AgentEngine` 和通用 outcome 调用引擎。
- 用户确认 gate 保留：plan 确认和 candidate preview 确认均由平台渲染与持久化。
- `context_insufficient` 等待用户补充文本，再创建新的同 task AgentRun；plan task 的新结果仍须重新确认。
- 平台不解析原生引擎 payload 驱动业务逻辑。
