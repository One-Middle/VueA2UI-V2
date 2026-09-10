# Backend 模块边界

`packages/backend`

定位：平台服务端，负责数据持久化、HTTP API、SSE、文件上传、Agent run 编排、Workflow gate 和正式提交事务。

## 模块功能

后端是平台的权威业务与状态层：将用户请求、workflow、artifact、Agent run 和正式 A2UI surface 持久化；通过稳定 API / SSE 暴露事实，并以引擎无关方式托管 Agent adapter 的一次运行。它控制业务状态和用户确认，不控制某个 Agent 如何推理。

## 负责

- Express API 和 SSE 通道。
- Prisma / PostgreSQL 持久化。
- 会话、消息、A2UI events、surface snapshots、Agent workflows、workflow steps、workflow artifacts、agent runs 和 tool calls。
- 文件上传和 skills 数据管理。
- 通过 Agent Engine SPI 创建和运行静态注册的 adapter，并消费通用 AgentRunOutcome。
- 应用 WorkflowStageGate：阶段前置条件、可见 capability、允许 WorkflowAction、允许结构化 outcome、失败处理和 retryable workflow 续跑。
- 只在用户确认后提交 exact stored candidate A2UI 为正式 A2UI event 和 surface snapshot。
- 维护 Agent 运行生命周期：切换会话、前端断线或页面刷新不取消运行；用户显式 `cancel` WorkflowAction 才中断当前 AgentRun。
- 将 `cancel` action 解释为可继续的中断：当前 AgentRun 变为 `cancelled`，当前 workflow 和 step 变为 `interrupted`，并记录 interruption reason。
- 在同一 workflow / step 上用新的 AgentRun 承载 interrupted 后的继续尝试。
- 在模型调用、工具调用、artifact 持久化、状态推进和 commit 事务前检查 cancellation token 与数据库状态。

## 不负责

- 直接生成后端模板 plan、clarification 或 candidate。
- 解析 adapter 私有配置、thread、SDK payload 或 raw Agent Output 驱动业务。
- 绕过结构化 outcome 和 `validateA2UI` 提交模型输出。
- 前端渲染。

## 边界

- 对 `packages/frontend` 提供 API 和 SSE。
- 通过 Agent Engine SPI 获取引擎无关的执行结果；ReAct、Codex 等 adapter 由注册表静态装配。
- 通过 `packages/shared` 共享 DTO、事件和业务 artifact 类型。
- WorkflowService 负责判断“这件事现在能不能做”，adapter 负责理解和执行当前 task。
- platform capability 与 WorkflowAction 必须保持分离。
- `failed_retryable` workflow 收到普通用户消息时，Backend 将其视为恢复触发器：复用最新失败 step、递增 step attempt、创建新的 AgentRun，并继续原阶段；等待确认态仍必须通过 WorkflowAction 推进。
- `interrupted` workflow 仍属于当前 active workflow。收到非空普通用户消息时，Backend 将其视为继续触发器：当前 step 从 `interrupted` 回到 `running`，创建新的 AgentRun，并继续原阶段。
- User Gate 是后端强制边界。无论前端是否正在监听，Agent 到达 clarification、plan confirmation、preview confirmation 或 commit 前确认时都必须持久化 artifact 并停止等待用户动作。
- Backend 不需要依赖 SSE client 数量判断用户是否在会话内；SSE 连接生命周期和 Agent 运行生命周期相互独立。

## Model IO Logging 边界

Backend（后端服务）承载已注册 adapter 的运行进程，因此 adapter 的 Model IO Logging 终端输出会出现在启动 backend 的终端窗口中。

Backend 负责：

- 为 adapter 提供其配置来源；adapter 自行决定是否读取 `MODEL_IO_LOG`、`AGENT_ROUND_DUMP` 或其他私有诊断配置。
- 作为本地开发进程承载 `logs/model-io/YYYY-MM-DD.jsonl` 与 `logs/agent-io/<sessionId>.txt` 的写入位置。
- 在本地调试时保留终端日志、JSONL trace、原始追写与 Agent run / workflow 上下文之间的可追踪性。

Backend 不负责：

- 不把 Model IO trace 暴露为 HTTP API 或 SSE 事件。
- 不把完整 prompt / response 写入业务数据库。
- 不把 Model IO trace 作为 workflow artifact 或用户可见消息。
- 不把该能力定义为生产审计日志。

如果后续需要前端查看、数据库留存或生产审计，必须重新进入 `30-contracts/` 定义 API、权限、脱敏和留存契约。

## 技术栈与依赖

- Node.js + TypeScript：服务进程与业务服务层。
- Express：HTTP API、上传接口与 SSE 连接管理。
- Prisma + PostgreSQL：业务实体、workflow、artifact、快照与运行记录持久化。
- Zod：请求、响应和跨边界 DTO 校验。
- Multer：文件上传；Pino：结构化服务日志。
- `packages/shared`：共享 API DTO、SSE 事件及 Agent Engine SPI；通过静态注册表使用 adapter。

## 核心实现

| 对象 | 主要职责 |
| --- | --- |
| `workflowService` | 校验阶段 gate、创建或恢复 step、持久化 artifact、处理 User Gate 与提交事务。 |
| `agentRunService` | 创建 AgentRun、装配 SPI request/host/options、转发事件、保存运行结果和诊断。 |
| `surfaceSnapshotRepository` | 持久化并读取正式 A2UI surface snapshot。 |
| Workflow / session 路由 | 将 HTTP action 转为服务调用，并返回稳定 DTO。 |
| SSE 服务 | 广播 workflow、artifact 与引擎语义事件；重连后由 Session Resync 恢复事实。 |
| `server.ts` | 装配 Express、中间件、路由、服务与已安装 engine plugin。 |

## 主要协作链路

```text
HTTP / SSE 客户端
  -> 路由 -> WorkflowService
  -> AgentRunService -> AgentEngine SPI adapter
  -> outcome / 事件 -> 校验与 Prisma 持久化
  -> SSE 语义事件、稳定 API DTO、正式 Surface Snapshot
```
