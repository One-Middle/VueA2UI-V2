# ReAct Agent 引擎 Adapter

## 目标

将现有 ReAct loop 改造成符合 SPI 的 adapter，使其与 Codex 或其他引擎在平台看来完全等价。

## 范围

- 实现 `ReactAgentEnginePlugin`、`ReactAgentEngine` 和配置 Schema。
- 从现有 ReAct runtime 中抽取模型循环、动作解析、观察和修复逻辑。
- 通过 `AgentEngineHost` 读取上下文、调用 capability、发出事件。
- 将 ReAct trace 映射为 SPI 语义事件与可选原始诊断。

## 边界

ReAct adapter 只能依赖 SPI 和自身运行时组件。A2UI、Workflow 输入、ToolRegistry 的平台实现、数据库、SSE 和 artifact 持久化必须位于平台 host adapter。

## 兼容策略

保持现有 `IAgentRuntime.runWorkflowTask()` 外部 API，内部经由 SPI workflow bridge 调用 ReAct adapter，直至旧入口被迁移。

## 验收标准

- 现有 ReAct 行为在兼容入口下回归通过。
- adapter 通过 workflow-v1 契约测试。
- 平台替换为假 adapter 时，ReAct 类型不从 workflow 服务泄漏。
