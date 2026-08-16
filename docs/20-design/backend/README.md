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

## Model IO Logging 边界

Backend（后端服务）承载 Agent Runtime 的运行进程，因此 Model IO Logging 的终端输出会出现在启动 backend 的终端窗口中。

Backend 负责：

- 通过 `.env` 读取 `MODEL_IO_LOG` 与 `AGENT_ROUND_DUMP`，让 Agent 模块决定是否输出模型输入输出日志或原始追写。
- 作为本地开发进程承载 `logs/model-io/YYYY-MM-DD.jsonl` 与 `logs/agent-io/<sessionId>.txt` 的写入位置。
- 在本地调试时保留终端日志、JSONL trace、原始追写与 Agent run / workflow 上下文之间的可追踪性。

Backend 不负责：

- 不把 Model IO trace 暴露为 HTTP API 或 SSE 事件。
- 不把完整 prompt / response 写入业务数据库。
- 不把 Model IO trace 作为 workflow artifact 或用户可见消息。
- 不把该能力定义为生产审计日志。

如果后续需要前端查看、数据库留存或生产审计，必须重新进入 `30-contracts/` 定义 API、权限、脱敏和留存契约。
