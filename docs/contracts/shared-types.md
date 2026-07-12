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

## 4. 维护规则

- 新增类型时，为 export 类型和接口补充中文 JSDoc。
- 修改 API DTO 时，同步 `docs/contracts/api.md`。
- 修改 A2UI 类型时，同步 `docs/contracts/a2ui-v0.9.md`。
- 修改 Agent result 或 validation 类型时，同步 `docs/modules/agent.md` 与相关后端提交逻辑。
