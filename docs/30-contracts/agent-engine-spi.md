# Agent Engine SPI v1 契约

## 1. 定位与边界

`@a2ui-platform/agent-engine-spi` 是平台 Core 与任意 Agent Engine Adapter 之间唯一的运行期契约。平台仅依赖 SPI；adapter 仅依赖 SPI。两者都不得依赖对方的私有实现。

```text
Platform Core -> Agent Engine SPI <- Engine Adapter
```

- Platform Core 不导入 ReAct、Codex 或其他引擎的 SDK、配置、thread、CLI 或原生事件类型。
- Engine Adapter 不导入 A2UI、Workflow、Prisma、SSE、HTTP 路由或平台服务。
- CLI、HTTP、MCP、进程内函数调用均可作为 adapter 私有传输实现，不属于 SPI。
- 本契约只约束引擎运行；clarification、plan、decision、candidate 等是平台为具体 task 提供的 `outputSchema` 所定义的结构化 artifact，不是 SPI 领域类型。

## 2. Plugin 与运行接口

```ts
export interface AgentEnginePlugin {
  manifest: AgentEngineManifest;
  create(config: JsonObject): Promise<AgentEngine> | AgentEngine;
}

export interface AgentEngine {
  run(
    request: AgentRunRequest,
    host: AgentEngineHost,
    options: AgentRunOptions,
  ): Promise<AgentRunOutcome>;
}

export interface AgentEngineHost {
  listContext(): Promise<ContextMaterialDescriptor[]>;
  readContext(input: ReadContextInput): Promise<ContextMaterial>;
  invokeCapability(input: CapabilityInvocation): Promise<CapabilityResult>;
  emit(event: AgentEngineEvent): Promise<void>;
  isCancelled(): boolean;
}
```

`manifest` 至少声明 `engineId`、插件版本、支持的 capability profile 与 adapter 自己的配置 Schema。`create(config)` 负责校验不透明 JSON 配置；平台不解释其字段、密钥引用或 SDK 参数。

## 3. 运行数据

### 3.1 Request、预算与上下文

`AgentRunRequest` 包含：

- 稳定的 `runId`、可读任务说明、任务输入 JSON 与最终 `outputSchema`。
- `contextCatalog`：每项为 `materialId`、`version`、类型、标题、摘要、字节数和可读取状态；不预置正文。
- `capabilityCatalog`：每项为稳定名称、说明、输入/输出 JSON Schema、调用模式与是否产生副作用。
- 可选 `continuation`：仅限相同引擎的先前不透明续跑状态。

`AgentRunOptions` 包含 `AbortSignal`、`deadline`、`maxEvents`、`maxContextBytes` 与关联信息。adapter 自主选择何时读取材料、如何压缩和如何组织内部会话；每次成功或失败运行都必须报告实际读取的 `contextUsed`，其条目至少含 `materialId` 与 `version`。

### 3.2 Capability

Capability 是 SPI 一级概念。adapter 只能通过 `host.invokeCapability()` 使用平台显式提供的能力；每次调用携带由 adapter 生成的 `callId`、能力名和 JSON 输入。平台负责授权、幂等、审计、业务副作用和返回值校验。

读取 Skill、Reference、Catalog 以及执行 `validateA2UI` 均可由平台映射为 capability 或 context material。adapter 不得假定它们存在，也不得将平台能力名称写入 SPI 核心类型。

### 3.3 Outcome 与失败

`AgentRunOutcome` 为唯一终止结果，且包含下列之一：

- `status: "completed"`：`output` 必须通过 request 的 `outputSchema` 校验，且只包含该 task 定义的最终 artifact。
- `status: "failed"`：返回标准 `AgentEngineFailure`。
- `status: "cancelled"`：返回取消原因和已收集的诊断。

所有 outcome 可包含 `contextUsed`、不透明 `continuation`、token/耗时等通用诊断和脱敏原生摘要。标准失败码至少包括 `invalid_output`、`budget_exhausted`、`context_insufficient`、`cancelled`、`transient_error`、`configuration_error` 与 `internal_error`；失败必须标记 `retryable`。平台只根据标准失败码、`retryable` 和 task 规则决定重试或状态迁移。

## 4. 事件与原生 payload

`AgentEngineEvent` 必须具有 adapter 源流内严格递增的 `sequence`、时间戳、语义 `type`、脱敏 `summary`，以及可选 JSON `native`。Host 还会为 adapter 事件与自身产生的 `context_read`/capability 事件分配一个统一、严格递增的持久化 sequence；API/SSE 只暴露后者。语义事件至少覆盖：运行开始/结束、文本进展、上下文读取、capability 开始/完成/失败、原生工具开始/完成/失败、预算告警和错误。

- adapter 必须将其原生事件映射为语义事件；平台不得用 `native` 驱动业务状态机。失败时 adapter 可在 `failure.nativePayload` 提供完整原生诊断；该字段仅交给 Host 加密留存，绝不进入 `diagnostics`、artifact、普通 API 或 SSE。
- `run_finished` 每次运行至多出现一次，且之后不得再发事件。
- 平台实时转发语义事件与脱敏 native 摘要；前端不得消费完整原生 payload。
- 正常完成的运行持久化语义事件和 native 摘要。失败运行的完整原生 payload 必须加密保存，最多保留 7 天，仅供受限排障访问；过期后删除。

## 5. `workflow-v1` Capability Profile

完整 workflow 接管要求 adapter 声明并满足 `workflow-v1`：

- 受 JSON Schema 约束的结构化最终输出。
- context catalog、按需读取与准确 `contextUsed`。
- capability 调用与可观测事件。
- AbortSignal、预算耗尽和标准失败结果。
- 不透明 continuation 的保存和恢复。

平台在 workflow 创建时选择满足该 profile 的 plugin，并固定 `engineId`、插件版本、配置指纹和 continuation 归属。一个 `session + workflow` 同时只允许一个活跃 turn。

## 6. 行为规则

- adapter 收到取消信号后不得开始新的 context 读取或 capability 调用，并应尽快返回 `cancelled`。
- adapter 在达到 deadline、事件数或上下文字节预算前停止，并以 `budget_exhausted` 结束；不得静默超支。
- `context_insufficient` 是可恢复的标准结果；平台把它路由到 task 定义的补充上下文路径。对于 A2UI workflow，平台等待用户通过既有输入框提供补充或修改文本，再以该文本创建新的同 task AgentRun；不得复用或改写已经结束的 run。失败的 task 是 plan 时，该次新 run 自然会产出新的 plan 并重新进入确认；失败的 task 是 candidate 时，则重试 candidate 生成。
- continuation 只能由相同 `engineId` 且声明兼容的插件版本恢复。平台必须拒绝跨引擎、未知版本或已过期 continuation；不得尝试翻译其内容。
- adapter 配置、实际密钥、模型、SDK item、thread、CLI 参数和原生工具细节不得进入业务 API、稳定 artifact 或前端状态。
- 工具调用记录、trace、token 用量、资源 ledger 与其他运行元数据不得混入 `output`；它们仅可作为受限 `diagnostics`、语义事件或平台持久化审计信息传递。

## 7. 非目标

- 不定义 A2UI 协议、workflow 状态机、用户确认、artifact 类型、数据库表或 API 路由。
- 不规定 adapter 与 host 的传输协议、认证实现、工作目录或会话存储方式。
- 不引入任意厂商 SDK 依赖，也不为 Codex、ReAct 或其他引擎保留专用分支。

## 8. 兼容与演进

- v1 的破坏性变更必须发布新的 capability profile 或 SPI 主版本。
- 新字段必须可选且有明确默认语义；未知语义事件必须可被平台和前端安全忽略。
- 现有 `IAgentRuntime`、`ParsedAgentResult` 与 `agent_trace_event` 仅是 ReAct 迁移期兼容契约；新 adapter 和新平台路径必须使用本文件定义的 SPI。
