# Shared 类型契约

## 1. 定位

`packages/shared` 是跨模块类型的唯一来源。API DTO、A2UI message、SSE event、Agent result、validation result 等跨模块类型应优先放入这里。

## 2. 文件划分

- `packages/shared/src/a2ui.ts`：A2UI v0.9 message、component、surface、Catalog 相关类型。
- `packages/shared/src/api.ts`：HTTP API request/response DTO。
- `packages/shared/src/agent.ts`：Agent 输入、结果、校验、tool call 类型。
- `packages/shared/src/sse.ts`：SSE event 类型。
- `packages/shared/src/logger.ts`：共享日志类型或工具。
- `packages/shared/src/index.ts`：统一导出入口。

## 3. 依赖规则

- `shared` 不依赖 `frontend`、`renderer`、`backend`、`agent`。
- 业务模块可以依赖 `shared`。
- 跨模块字段变更必须先修改 `shared`，再修改调用方。
- 不允许在多个模块重复定义 Session、Message、A2UIEvent、SurfaceSnapshot、SSEEvent、AgentResult 等 DTO。

## 3.1 Agent Runtime 共享字段

- `AgentRunInput.enabledSkills` 包含 `id`、`name`、`description`、`content` 和可选 `references`；Runtime 初始 Prompt 只暴露 Skill 摘要和 Reference 摘要，完整 `content` 仅在 `skillInfoRequest` 命中后披露，完整 Reference 内容仅在 `skillReferenceRequest` 命中后披露。
- `SkillReference` 包含 `id`、`title`、`content` 和可选 `description`，表示隶属于单个 Skill 的参考资料正文。
- `ToolCallRecord.phase` 用于标记工具调用所属阶段，后端 SSE 会将该阶段透传给前端。
- `IAgentRuntime` 接口定义了 Agent Runtime 的唯一调用契约 `run(input, onToolCall?) → AgentRunResult`，后端只依赖此接口，不感知具体实现。
- `AgentRuntimeFactoryConfig` 定义工厂函数所需的最小配置（模型 API 连接参数），与具体模型客户端实现无关。
- `AgentRuntimeFactory` 是工厂函数签名，后端持有此类型引用；替换 Agent 实现只需换一行 import。

## 4. 维护规则

- 新增类型时，为 export 类型和接口补充中文 JSDoc。
- 修改 API DTO 时，同步 `docs/30-contracts/api.md`。
- 修改 A2UI 类型时，同步 `docs/30-contracts/a2ui-v0.9.md`。
- 修改 Agent result 或 validation 类型时，同步 `docs/40-implementation/modules/agent/README.md` 与相关后端提交逻辑。

