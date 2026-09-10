# 设计

`20-design/` 维护长期模块职责、边界和跨模块协作方式，帮助开发者和 Agent 在动手前理解“每个模块负责什么、不负责什么、与谁交互”。

每个模块文档都应至少说明：解决的问题、对外功能、职责边界、技术栈、核心实现对象、主要协作链路和稳定契约。这里记录长期架构；具体改动、任务拆分和迁移步骤分别进入 `40-implementation/` 与 `matt_docs/`。

## 文件索引

- [Agent](./agent/README.md)
- [Agent Engine](./agent-engine/README.md)
- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)
- [Renderer](./renderer/README.md)

`packages/shared` 和端到端链路不是独立设计子系统，边界说明见下方。

| 模块 | 核心职责 | 主要技术栈 | 关键实现入口 |
| --- | --- | --- | --- |
| Agent Engine | 以统一 SPI 托管不同 Agent 引擎 | TypeScript、Zod、插件注册 | `AgentEnginePlugin`、`AgentEngineHost`、注册表 |
| Agent | 当前 ReAct adapter 与模型循环 | TypeScript、Ajv、Zod、OpenAI-compatible API | `AgentRuntime`、`WorkflowAgentExecutor`、`ModelClient` |
| Backend | 业务编排、持久化、API 与 SSE | Node.js、Express、Prisma、PostgreSQL、Zod | `WorkflowService`、`AgentRunService`、路由层 |
| Frontend | 工作台与 workflow 交互 | Vue 3、Vite、Pinia、Vue Router、Naive UI | router、workspace store、PreviewPanel |
| Renderer | 框架无关的 A2UI Runtime 与 DOM/Vue/React Adapter | TypeScript、Acorn/SES、DOM API、Vue、React | `SurfaceRuntime`、`RenderPlan`、各 Adapter mount / bridge |

## 共享类型层：`packages/shared`

定位：跨模块类型和契约承载层。

负责：

- API DTO。
- SSE event 类型。
- Agent Engine SPI、通用运行结果、上下文材料、capability、事件和诊断 DTO。
- Resource Ledger Snapshot 与引擎无关的 trace DTO 类型。
- A2UI message 类型。
- 其他需要跨模块共享的 TypeScript 类型。

不负责：

- 业务流程实现。
- 运行时副作用。
- UI 渲染。
- 数据库访问。

边界：

- 可被 frontend、renderer、backend、agent 依赖。
- 不依赖任何业务模块。
- 类型变化必须同步 `../30-contracts/`。

技术栈与核心实现：

- TypeScript：以类型、常量、DTO、Schema 和小型无副作用工具函数表达跨模块契约。
- Zod：对 API 输入输出、公共配置或需要运行期防御的 DTO 提供可执行 Schema；纯编译期约束保持为 TypeScript type。
- 核心契约包括 A2UI message、API DTO、SSE event、Workflow artifact、Agent Engine SPI 的 `AgentEnginePlugin` / `AgentEngineHost` / `AgentRunOutcome`，以及上下文与 capability 描述。
- 该层不能导入 Prisma、Express、Vue、DOM 或任一 Agent SDK；新增依赖必须先证明它仍是跨模块且无业务方向性的契约。

## Agent Workflow 协作边界

workflow 阶段为：

```text
plan -> generate_a2ui -> validate -> preview -> commit
```

职责拆分：

- Agent Engine Adapter 负责理解用户输入、组织上下文、执行模型或引擎循环、调用平台 capability，并输出符合 task Schema 的结构化结果。ReAct 只是当前 adapter 之一。
- Agent Engine SPI 负责隔离平台与具体引擎；平台提供上下文材料和 capability，adapter 自主决定如何读取材料并组织内部会话，同时回传 `contextUsed`、通用事件和诊断。
- Resource Ledger 负责在 workflow 的多个 task 之间共享已披露的 Skill / Skill Reference，避免重复注入正文。
- WorkflowService 负责当前阶段 gate、可见工具、状态推进、持久化 artifact、失败和重试；当 workflow 处于 `failed_retryable` 时，用户追加普通消息是恢复触发器，复用最新失败 step 并创建新的 AgentRun 继续尝试。
- WorkflowService 负责 Agent 生命周期边界：前端断线、刷新或切换会话不会取消后端 Agent；只有用户显式 `cancel` WorkflowAction 才会中断当前运行，并把 workflow/step 标记为 `interrupted`，后续普通消息可沿原阶段继续。
- API 只返回稳定 DTO / SSE payload，不暴露 raw Agent Output 给前端主流程；原生引擎 payload 仅进入运行诊断。
- Frontend 只渲染 parsed/validated artifact 和稳定 DTO。

关键边界：

- clarification、plan、decision 和 candidate 是 task Schema 约束的结构化 outcome；平台根据 outcome 渲染用户表单与推进状态。
- `submit_clarification` 和 `submit_decision` 是 WorkflowAction，不是 platform capability。
- `failed_retryable` 的续跑由普通消息入口触发，不等同于 `submit_decision` / `submit_clarification`，也不绕过等待确认态的 WorkflowAction gate。
- `interrupted` 的续跑也由普通消息入口触发。它表示用户主动停止当前 AgentRun 后保留 workflow 上下文，不等同于 workflow 终态 `cancelled`。
- User Gate 是 Agent 必须停止等待用户动作的边界，包含 clarification、plan confirmation、preview confirmation 和 commit 前确认。Agent 在后台运行时最多推进到 User Gate，不能自动越过确认或提交边界。
- SSE 只负责实时同步，断线重连后的事实源恢复由 Session Resync 完成；第一版不依赖 `Last-Event-ID` 事件回放补齐业务状态。
- raw Agent Output 只能进入 debug metadata 摘要，例如 `rawOutputPreview`。
- `workflow_artifacts` 只保存 parsed/validated 后的稳定产物。
- 引擎语义事件通过稳定 SSE DTO 实时推送；正常运行持久化语义事件和原生摘要，失败运行额外保留完整原生 payload。

## 端到端链路：Integration

定位：端到端链路边界，不是独立 package。

负责说明：

- 用户输入如何经过 frontend、backend、agent、shared、renderer。
- Agent Workflow 如何串联 message、agent run、tool call、artifact、A2UI event 和 surface snapshot。
- SSE 如何同步 workflow 进度、artifact 和失败状态。

不负责：

- 替代任何单模块实现说明。
- 定义 API、DB 或 A2UI 字段细节。

技术栈与核心链路：

- 技术基础是 frontend 的 HTTP/SSE client、backend 的 Express/SSE 与 Prisma 事务、agent-engine SPI，以及 renderer 的 framework-agnostic Runtime 与宿主选用的 Adapter；链路本身不新增 package。
- 关键对象是用户消息、Workflow/Step、AgentRun、结构化 artifact、A2UI event 与 Surface Snapshot。每个对象各有权威归属：业务状态属于 Backend，渲染状态属于 Renderer，私有推理状态属于 adapter。
- 端到端验证关注“稳定 DTO 是否可恢复到一致工作台状态”，而非某次引擎 raw trace 是否逐字复现。

## 维护规则

- 当模块长期职责、边界或上下游关系变化时，更新对应模块 README。
- 当前实现细节变化进入 `../40-implementation/`。
- 跨模块数据形状变化进入 `../30-contracts/`。
- 任务推进、spec、tickets 或 handoff 进入 `../matt_docs/`。
