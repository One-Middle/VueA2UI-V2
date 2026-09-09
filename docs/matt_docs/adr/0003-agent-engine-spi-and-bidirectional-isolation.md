# Agent 引擎 SPI 与双向隔离

Status: Accepted

平台将通过独立的 `@a2ui-platform/agent-engine-spi` 托管 agent 引擎。平台不知道正在使用 ReAct、Codex 或其他引擎；adapter 也不知道 A2UI、Workflow、数据库、SSE 或其他平台业务。任何 agent 工具只要实现 SPI、通过契约测试并被静态注册，即可成为平台引擎。

## Context

现有运行时将 ReAct loop、Workflow 输入、工具注册、A2UI 校验和 trace 紧密组合。替换为 `@openai/codex-sdk` 或后续第三方 agent 时，如果把厂商 SDK、thread、CLI、模型配置或原生事件扩散到业务平台，会使每次新增引擎都需要改动 Workflow 和持久化逻辑。

反过来，如果 Codex adapter 直接依赖 A2UI、Workflow、Prisma 或平台后端服务，它就不再是可复用的 agent adapter。Codex 只是一个 agent 引擎实现，不应在架构中拥有特殊地位。

平台还需要保留工作流权威事实、用户确认 gate、A2UI 最终校验、持久化和审计；引擎需要自主选择上下文材料、组织内部会话、使用原生能力，并输出结构化运行信息。

## Decision

- 新建无平台和无厂商依赖的 `@a2ui-platform/agent-engine-spi` 包。
- SPI 的唯一执行入口为 `AgentEngine.run(request, host, options)`；插件通过 `AgentEnginePlugin.create(config)` 创建引擎实例。
- 平台只依赖 SPI。平台保存通用 `EngineBinding`：`engineId`、插件版本、不透明配置和不透明 continuation；平台不解析 adapter 配置、密钥、SDK 类型、thread 或原生事件 payload。
- adapter 只依赖 SPI。adapter 不导入 A2UI、Workflow、Prisma、SSE 或平台服务；Codex、ReAct 与未来引擎均作为独立 adapter 实现。
- adapter 自己定义和校验配置 Schema。密钥仅以环境变量名或密钥引用配置，由 adapter 自行解析；实际密钥不写入平台数据库、workflow metadata 或审计记录。
- `AgentRunRequest` 提供普通任务说明、输出 JSON Schema、上下文材料目录、能力目录和 continuation。它不包含平台领域类型。
- 平台通过 `AgentEngineHost` 提供 `listContext`、`readContext`、`invokeCapability` 和 `emit`。SPI 不规定 CLI、HTTP、MCP 或直接函数调用等传输方式。
- 平台提供上下文材料和版本；adapter 自主决定读取哪些材料、如何压缩和如何组织会话。adapter 必须返回 `contextUsed`，记录材料标识和版本。
- `workflow-v1` 是完整工作流引擎能力档案：结构化输出、outputSchema、按需上下文、capability 调用、取消、预算、统一错误和 continuation。平台只选择满足该档案的引擎接管完整 workflow。
- 所有 adapter 发送统一语义事件，并可在 `native` 字段保留原始结构化事件。平台实时接收全部事件；正常运行持久化语义事件和原始摘要，失败运行额外保留完整原始 payload。
- 平台传递通用 `deadline`、`maxEvents`、`maxContextBytes` 等预算；adapter 报告 `budget_exhausted`。adapter 使用统一错误码和 `retryable` 标记，平台以引擎无关的策略重试当前 task。
- 平台保留 workflow 状态转换、plan/candidate 用户确认、工件持久化、A2UI 权威校验和最终提交。完整工作流可由任意 `workflow-v1` 引擎执行；平台依据通用结构化 outcome 推进状态。
- `context_insufficient` 是标准可恢复结果：平台等待用户通过既有输入框补充或修改文本，再以该文本启动新的同 task AgentRun，而不是允许引擎在缺失材料下继续猜测。若失败的是 plan task，新 run 会生成新 plan 并进入重新确认；若失败的是 candidate task，则重新生成 candidate。

## Codex Adapter Application

`@openai/codex-sdk` 是本决策的第一个非 ReAct 验证对象，不是 SPI 的特殊扩展。

- Codex adapter 私有地管理 SDK、`CODEX_API_KEY`、模型、推理强度、thread、持久化 session 卷、隔离工作目录和原生自动执行策略。
- Codex adapter 使用私有的通用 `engine-host` CLI 访问 `AgentEngineHost`。该 CLI 使用短期运行 token 和 loopback HTTP 只是 Codex adapter 的内部实现；它不是平台的 `a2ui-agent` 命令。
- Codex 的 `runStreamed` 结构化事件映射为 SPI 语义事件和 native payload；task 专用 outputSchema 返回通用 JSON outcome。
- 同一 `session + workflow` 同时只允许一个活跃引擎 turn。Codex continuation 只能由同一兼容 adapter 恢复，不跨引擎迁移。

## Considered Options

- 让 Workflow 服务直接选择并调用 Codex SDK。实现较快，但会让业务平台依赖 SDK、thread、认证、CLI 和事件类型，未来接入其他引擎必须重复修改平台。
- 让每个 adapter 直接调用平台数据库和服务。adapter 可快速实现已有工具，但无法独立发布或被其他宿主使用，也会绕过平台权限和审计边界。
- 将所有上下文正文预组装并传给每个引擎。平台容易控制输入，但会造成上下文膨胀，并剥夺引擎选择、压缩和会话组织能力。
- 将上下文组织和工具传输固定为 MCP。MCP 可用，但它是某些 adapter 的传输选择，不应成为所有 agent 引擎的 SPI 前提。
- 只保留统一语义事件。前端简单，但会丢失 Codex 等引擎的结构化诊断、工具和文件变更信息。
- 允许平台解析原始引擎 payload 驱动业务。可以减少短期映射代码，但会使业务状态机绑定厂商协议。

## Consequences

- 新增引擎的主要工作变为实现 adapter、私有 transport 和契约测试，而不是修改 Workflow 业务。
- ReAct runtime 需要被重构为 SPI adapter；现有 `IAgentRuntime` 可作为临时兼容外观逐步迁移。
- 平台需要实现通用上下文材料、capability、预算、事件和 outcome 映射层。
- adapter 需要更严格地维护配置、续跑状态、原生事件和取消语义，但这些实现细节不会泄漏到平台。
- 需要维护核心 SPI 与 `workflow-v1` 契约测试，防止 adapter 仅在 TypeScript 类型上兼容而行为不兼容。
- Codex 可以完整接管澄清、plan、确认后续跑、candidate、校验修复和预览决策；平台保留最终确认和提交的确定性控制。
