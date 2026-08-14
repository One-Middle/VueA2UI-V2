# Backend 模块边界

`packages/backend`

定位：平台服务端，负责数据持久化、HTTP API、SSE、文件上传、Agent run 编排、Workflow gate 和正式提交事务。

## 负责

- Express API 和 SSE 通道。
- Prisma / PostgreSQL 持久化。
- 会话、消息、A2UI events、surface snapshots、Agent workflows、workflow steps、workflow artifacts、agent runs 和 tool calls。
- 文件上传和 skills 数据管理。
- 调用 Agent Runtime 并消费 Parsed Agent Result。
- 应用 WorkflowStageGate：阶段前置条件、可见 AgentTools、允许 WorkflowAction、允许 Parsed Agent Result 和失败处理。
- 只在用户确认后提交 exact stored candidate A2UI 为正式 A2UI event 和 surface snapshot。

## 不负责

- 直接生成后端模板 plan、clarification 或 candidate。
- 绕过 Agent Runtime 消费 raw Agent Output。
- 绕过 Parsed Agent Result 和 `validateA2UI` 提交模型输出。
- 前端渲染。

## 边界

- 对 `packages/frontend` 提供 API 和 SSE。
- 通过 `packages/agent` 获取 Agent Runtime 执行结果。
- 通过 `packages/shared` 共享 DTO、事件和 Agent 结果类型。
- WorkflowService 负责判断“这件事现在能不能做”，Agent 负责理解“用户这句话想干什么”。
- `AgentTool` 与 `WorkflowAction` 必须保持分离。
