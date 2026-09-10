# Agent Engine 模块边界

定位：平台与任意 agent 引擎之间的通用托管层。它通过 `@a2ui-platform/agent-engine-spi` 让平台运行符合约定的 adapter，而不依赖 ReAct、Codex 或其他引擎的 SDK、会话和配置。

## 模块功能

将“运行一个 Agent”收敛为稳定的插件与运行期契约：平台提交任务、输出 Schema、可读取的上下文材料、通用 capability 和预算；adapter 组织自己的 prompt、会话、模型与工具循环，并回传结构化结果、已使用材料和语义事件。这样替换或新增引擎不要求平台认识任何引擎私有概念。

## 核心边界

```text
平台 Core -> Agent Engine SPI <- Engine Adapter
```

- 平台 Core 不依赖具体引擎的类型、SDK、CLI、模型配置、密钥或私有会话状态。
- Engine Adapter 不依赖 A2UI、Workflow、Prisma、SSE 或平台后端服务。
- adapter 可使用 CLI、HTTP、MCP 或直接函数调用接入宿主；传输是 adapter 私有实现，不属于 SPI。

## 负责

- 定义并维护 `AgentEnginePlugin`、`AgentEngine`、`AgentEngineHost`、请求、结果、事件、预算、失败和续跑的 SPI。
- 静态注册已安装的 adapter，并以 `engineId`、插件版本、不透明配置和 continuation 绑定 workflow。
- 向 adapter 提供上下文材料目录、按需读取能力、通用 capability 调用、事件接收和取消信号。
- 要求 adapter 回传结构化 outcome、`contextUsed`、统一错误、续跑状态和诊断。
- 定义 `workflow-v1` 能力档案：结构化 JSON 输出、outputSchema、按需上下文、capability 调用、取消、预算、失败分类和 continuation。
- 对外提供统一语义事件；允许 adapter 附带原始结构化引擎 payload 用于诊断。

## 不负责

- 不定义 plan、A2UI、clarification form、decision form 或数据库领域模型。
- 不决定 workflow 状态转换、用户确认、candidate freshness、A2UI 校验或正式提交。
- 不规定 adapter 与宿主之间使用哪种传输协议。
- 不读取或解释 adapter 的密钥、模型、SDK 类型、thread、CLI 参数或 continuation 内容。

## 上下文与能力

平台提供 `contextCatalog`，每项只包含材料标识、版本、摘要和可读取性。adapter 自主决定读取哪些正文、如何压缩和如何组织内部会话；每次运行必须返回实际使用的 `contextUsed`。

平台将可调用能力以名称、输入 JSON Schema、输出 JSON Schema 和模式暴露给 adapter。adapter 通过 `AgentEngineHost.invokeCapability()` 调用；平台负责权限、幂等、审计和业务副作用。CLI 或 MCP 只是某个 adapter 对该接口的映射。

## 运行语义

- 每次 `run()` 只返回一个 `completed`、`failed` 或 `cancelled` 终止结果。
- 事件按 sequence 递增，`run_finished` 至多一次。
- 平台传递 `deadline`、`maxEvents`、`maxContextBytes` 等通用预算；adapter 以 `budget_exhausted` 报告耗尽。
- adapter 响应取消信号，取消后不得发起新的平台 capability 调用。
- adapter 以统一错误码和 `retryable` 标记报告临时故障；平台以引擎无关策略重试当前 task。
- 正常运行持久化语义事件和原生摘要；失败运行额外保留完整原生 payload。
- continuation 对平台不透明，只能由相同 engineId 和兼容版本恢复。

## 与 Workflow 的协作

平台将 workflow task 投影为普通任务说明、输出 JSON Schema、上下文目录、能力目录与预算。adapter 返回通用 JSON outcome；平台执行权威校验并决定状态转换。

平台始终保留 clarification、plan confirmation、preview confirmation 与 commit confirmation 的 User Gate，以及 artifact 持久化、A2UI 校验和最终提交。完整 workflow 可由任意满足 `workflow-v1` 的 adapter 执行；`context_insufficient` 会等待用户在既有输入框补充文本，并以该文本启动新的同 task AgentRun。plan task 因此产生新 plan 并再次确认；candidate task 则重新生成 candidate。

## 已知 Adapter

- ReAct adapter：当前默认实现，复用现有 loop 和模型客户端。
- Codex SDK adapter：使用 `@openai/codex-sdk`，其 SDK、CLI、thread、`CODEX_API_KEY`、隔离工作目录和原生事件均保持在 adapter 内部。

新增 adapter 的唯一要求是实现 SPI、声明能力、通过契约测试并被静态注册。

## 技术栈与依赖

- TypeScript：定义零业务依赖的 SPI 类型与生命周期接口。
- Zod（建议）：校验 SPI DTO、事件和插件清单；具体 adapter 可使用其他校验器。
- Node.js 模块系统：静态装配已安装 plugin，不加载远程代码。
- `packages/shared`：SPI 的发布位置；不依赖 backend、agent 或某个引擎 SDK。

## 核心实现

| 对象 | 职责 |
| --- | --- |
| `AgentEnginePlugin` | 声明 `engineId`、版本、能力档案并由 `create(config)` 创建引擎实例。 |
| `AgentEngine` | 执行 `run(request, host, options)`，管理引擎私有循环与 continuation。 |
| `AgentEngineHost` | 向 adapter 暴露 `listContext`、`readContext`、`invokeCapability`、`emit` 与取消状态。 |
| `AgentEngineRegistry` | 在平台启动时静态注册 plugin、校验配置并按绑定的引擎创建实例。 |
| 契约测试套件 | 用标准 host fixture 验证事件顺序、取消、预算、上下文追踪、错误与续跑语义。 |

这些对象是目标结构；实现阶段会落入 SPI 包、后端注册表和各 adapter 包，而不是集中为一个与平台耦合的“引擎服务”。

## 主要协作链路

```text
WorkflowService
  -> AgentEngineRegistry 选择已绑定 plugin
  -> AgentEngine.run(request, host, options)
  -> adapter 按需 readContext / invokeCapability / emit
  -> AgentRunOutcome（结构化 outcome + contextUsed + diagnostics）
  -> WorkflowService 校验、持久化并推进或停在 User Gate
```
