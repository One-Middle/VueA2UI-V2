# Agent 引擎 SPI 契约

## 目标

定义 `@a2ui-platform/agent-engine-spi` v1：平台和 agent 引擎之间唯一的稳定边界。平台不知道使用的引擎，adapter 也不知道接入的平台业务。

## 核心边界

```text
平台 Core -> Agent Engine SPI <- 任意 Engine Adapter
```

- 平台 Core 不导入 Codex、ReAct 或其他引擎 SDK、类型、配置和会话状态。
- Engine Adapter 不导入 A2UI、Workflow、Prisma、SSE 或任何平台业务服务。
- adapter 私有配置和续跑状态均为不透明 JSON；平台仅绑定引擎标识、插件版本和状态归属。
- CLI、HTTP、MCP 或直接函数调用均属于 adapter 内部传输实现，不属于 SPI。

## 范围

- 定义插件、引擎、请求、宿主、上下文材料、能力调用、事件、结果、预算、失败与续跑接口。
- 定义最小核心能力和 `workflow-v1` 能力档案。
- 定义严格事件时序、取消、预算和重试语义。

## 核心接口

- `AgentEnginePlugin.create(config)`
- `AgentEngine.run(request, host, options)`
- `AgentEngineHost.listContext/readContext/invokeCapability/emit`
- `AgentRunRequest`：任务说明、输出 Schema、上下文与能力目录。
- `AgentRunOutcome`：结果、contextUsed、失败分类、续跑状态和诊断。
- `AgentEngineEvent`：通用语义事件，可选保留原生结构化 payload。

## 行为约定

- 每次运行只返回一个终止结果。
- 事件 sequence 严格递增，`run_finished` 至多一次。
- adapter 响应 AbortSignal；取消后不得发起新的平台 capability 调用。
- adapter 必须按输出 Schema 返回 JSON，否则返回 `invalid_output`。
- adapter 按需读取材料后必须回传 `contextUsed`。
- 平台传递通用预算；adapter 以 `budget_exhausted` 报告耗尽。
- adapter 以统一错误码和 `retryable` 报告临时失败；平台按通用策略决定 task 重试。
- 原生引擎事件需映射为语义事件；可通过 `native` 透传原始 JSON。

## 能力档案

核心 SPI 要求生命周期、结果、事件和取消。完整 workflow 接管要求 `workflow-v1`：

- 结构化 JSON 输出及 outputSchema。
- 上下文目录、按需读取和 contextUsed。
- capability 调用。
- 取消、预算和标准失败结果。
- 续跑状态。

## 非目标

- 不定义 A2UI、plan、表单、数据库或具体工作流状态。
- 不规定 adapter 与 host 的传输协议。
- 不引入任何厂商 SDK 依赖。

## 验收标准

- SPI 包可独立导入和类型检查。
- 第三方 adapter 仅依赖 SPI 即可实现并通过契约测试。
- 平台可在不引用引擎类型的情况下运行任何符合 `workflow-v1` 的 adapter。
