# 04 - Workflow-aware sendMessage

**构建内容：** 优化现有用户消息流程，使发送消息可以根据 session state 和 message intent 启动、推进或绕过 Agent Workflow。

**阻塞关系：** 03 - WorkflowService skeleton.

**Status:** resolved

- [x] 发送用户消息仍会持久化用户可见 message。
- [x] 如果 session 有 active workflow，message 会路由到 `WorkflowService` 以推进当前 workflow。
- [x] active workflow 中的用户自然语言输入会作为 WorkflowAction 的输入处理，而不是 AgentTool 调用。
- [x] 如果没有 active workflow，后端会区分 A2UI generation 或 modification intent 与普通 text-only conversation。
- [x] A2UI generation 或 modification intent 会启动新的 Agent Workflow。
- [x] 普通 non-workflow messages 仍可以生成轻量文本响应，而不创建 workflow steps 或 artifacts。
- [x] 进入 workflow 后，`sendMessage` 只负责保存用户可见 message 和路由；Agent 输出必须经 Agent Runtime 解析为 Parsed Agent Result 后再由 WorkflowService 转成 API Output。
- [x] 测试覆盖 active workflow continuation、新 workflow creation 和普通 message handling 的路由。
