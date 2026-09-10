# Codex SDK Agent Adapter

## 目标

将 `@openai/codex-sdk` 封装为纯 SPI adapter；Codex 只是符合 `workflow-v1` 的一个引擎实现。

## SDK 已知事实

SDK 包装本机 `codex` CLI，通过 JSONL 交换事件；同一 Thread 支持多次 run，runStreamed 提供结构化事件，outputSchema 支持 JSON Schema，resumeThread 依赖本地 session 存储。

## 范围

- 实现 `CodexSdkAgentPlugin`、私有配置 Schema 与 client bridge。
- 使用 runStreamed 映射语义事件和完整原生结构化 payload。
- 使用 task outputSchema 获得 WorkflowOutcome JSON。
- 通过 adapter 自有的通用 `engine-host` CLI 访问 AgentEngineHost；CLI 使用 loopback HTTP 和短期运行 token。
- 保存不透明 thread continuation；单实例后端使用持久化 session 卷。
- 每个 session/workflow 使用带 TTL 的隔离工作目录，并以 skipGitRepoCheck 启动。
- 原生 Codex 能力自动执行并映射 `native_tool_*` 事件，不由平台拦截。

## 隔离要求

- Codex adapter 不依赖 A2UI、Workflow、Prisma、SSE 或平台后端包。
- 平台不依赖 Codex SDK、CLI、thread、CODEX_API_KEY 或原生事件类型。
- `engine-host` 是 adapter 的内部工具，不是平台命令；其协议只映射 AgentEngineHost。

## 全 workflow 接管

adapter 支持澄清、plan、用户确认后的续跑、candidate、自主 validateA2UI 修复、preview decision 和 context_insufficient。平台负责所有权威状态转换和最终提交。

## 验收标准

- 通过 workflow-v1 契约测试及 adapter 隔离检查。
- 真实 SDK spike 验证 API Key、线程恢复、CLI、outputSchema、事件、取消和 working directory。
- 真实集成测试验证全 workflow 的用户确认、修订、候选校验与续跑。
