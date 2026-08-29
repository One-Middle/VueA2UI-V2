# Shared 模块说明

## 1. 功能定位

`packages/shared` 是跨模块类型包，负责维护 A2UI message、API DTO、SSE event、Agent result、validation result、logger 等共享契约。它是 Agent、Backend、Frontend、Renderer 之间类型协作的唯一公共来源。

Shared 只定义类型和少量常量/辅助契约，不承载业务流程。

## 2. 技术栈

- 包路径：`packages/shared`
- 语言：TypeScript
- 构建：tsc
- 测试：Vitest
- 运行依赖：无业务模块依赖

## 3. 职责边界

负责：

- A2UI v0.9 server/client message 类型。
- Basic Catalog 组件名称和 Catalog 类型。
- API request/response DTO。
- SSE event 类型。
- Agent runtime 输入、输出、校验和 tool call 类型。
- Logger 共享类型或辅助。
- 统一导出入口。

不负责：

- 不实现业务逻辑。
- 不访问数据库。
- 不调用模型。
- 不依赖 frontend、renderer、backend 或 agent。
- 不替代 JSON Schema 或 Prisma schema。

## 4. 真实工程结构

```text
packages/shared/src/
  a2ui.ts
  agent.ts
  api.ts
  index.ts
  logger.ts
  resource-ledger.ts
  sse.ts
```

## 5. 文件职责

| 文件                     | 作用                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/a2ui.ts`            | A2UI v0.9 消息、Renderer 回传、脚本声明、Basic Catalog、surface snapshot 类型。                                             |
| `src/api.ts`             | HTTP API request/response DTO、分页、错误、会话、消息、文件、Skill、Agent run、Tool call、A2UI event、snapshot 和导出类型。 |
| `src/agent.ts`           | AgentRunInput、AgentRunResult、ValidateA2UIResult、ToolCallRecord、IAgentRuntime 和工厂配置。                               |
| `src/resource-ledger.ts` | Resource Ledger Snapshot 契约类型（已披露 Skill / Reference 的键与元信息）。                                                |
| `src/sse.ts`             | AgentRunPhase、SSE event name（含 `connected`、`workflow_interrupted`、`agent_trace_event`）和 PlatformSseEvent 联合类型。  |
| `src/logger.ts`          | 共享日志类型或辅助。                                                                                                        |
| `src/index.ts`           | 统一 re-export 入口。                                                                                                       |

## 6. 核心类型

| 类型 / 常量                              | 位置                                      | 作用                                                                                             |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `A2UI_VERSION`                           | `src/a2ui.ts`                             | 当前协议版本常量，值为 `v0.9`。                                                                  |
| `A2UIServerMessage`                      | `src/a2ui.ts`                             | 后端传给 Renderer 的 server-to-client 消息联合。                                                 |
| `A2UIClientMessage`                      | `src/a2ui.ts`                             | Renderer 回传 action/error 的 client-to-server 消息联合。                                        |
| `A2UIComponentActionDeclaration`         | `src/a2ui.ts`                             | 组件 action 声明，包含 `event`、`script` 和未来保留的 `functionCall`。                           |
| `A2UIPropertyScriptDeclaration`          | `src/a2ui.ts`                             | 组件属性脚本声明，包含 `code`、`deps` 和 `fallback`。                                            |
| `BASIC_CATALOG_DEFINITION`               | `src/basic-catalog/catalog-definition.ts` | 当前正式 Basic Catalog 的组件、字段 schema、字段语义和 Renderer 映射单一事实源，不包含 `Modal`。 |
| `BASIC_CATALOG_COMPONENTS`               | `src/basic-catalog/catalog-definition.ts` | 从 `BASIC_CATALOG_DEFINITION` 派生的当前正式 Basic Catalog 20 个组件名称。                       |
| `SurfaceSnapshotData`                    | `src/a2ui.ts`                             | 后端持久化和前端恢复 Renderer 状态的数据结构。                                                   |
| `SessionDto` / `MessageDto` / `SkillDto` | `src/api.ts`                              | 前后端主要业务 DTO。                                                                             |
| `AgentRunDto` / `ToolCallDto`            | `src/api.ts`                              | Runtime 面板和后端 run 记录使用的 DTO。                                                          |
| `RuntimeConfigDto`                       | `src/api.ts`                              | Runtime 配置展示 DTO。                                                                           |
| `ExportSessionDto`                       | `src/api.ts`                              | 完整会话导出结构。                                                                               |
| `AgentRunInput`                          | `src/agent.ts`                            | 后端注入给 Agent Runtime 的完整上下文输入。                                                      |
| `AgentRunResult`                         | `src/agent.ts`                            | Agent 返回结果，包含 `COMMITTED`、`TEXT_ONLY`、`FAILED`。                                        |
| `ToolCallRecord`                         | `src/agent.ts`                            | Agent 工具调用回调记录，后端会持久化为 tool call。                                               |
| `PlatformSseEvent`                       | `src/sse.ts`                              | 后端推给前端的 SSE 事件联合类型。                                                                |
| `AgentTraceEventDto`                     | `src/api.ts`                              | ReAct 循环单条实时 trace 事件，通过 `agent_trace_event` SSE 推送。                               |
| `AgentRunTraceSummaryDto`                | `src/api.ts`                              | ReAct 循环持久化 trace 摘要，写入 `agent_runs.metadata.traceSummary`。                           |
| `ResourceLedgerSnapshot`                 | `src/resource-ledger.ts`                  | 跨 workflow task 共享的已披露资源快照（不含正文）。                                              |

Workflow 生命周期类型包含可继续中断状态：

- `AgentWorkflowStatus` 包含 `interrupted`，表示当前运行被用户或系统中断，但 workflow 仍可通过后续普通消息继续。
- `WorkflowStepStatus` 包含 `interrupted`，表示当前 step 停在可继续的中断点。
- `WorkflowActionResponse` 可返回受 action 影响的 `step`，用于 `cancel` 后让前端立即更新当前 step。
- `PlatformSseEvent` 包含 `connected` 和 `workflow_interrupted`；前者用于 SSE 建连生命周期，后者用于广播可继续中断结果。

## 7. 当前 A2UI 类型边界

服务端消息支持：

- `createSurface`
- `updateComponents`
- `updateDataModel`
- `deleteSurface`

客户端回传支持：

- `action`：当前 payload `kind` 固定为 `"event"`。
- `error`：Renderer 渲染或绑定错误。

组件声明中保留：

- `action.event`：当前正式支持。
- `action.script`：Renderer 当前支持受限执行。
- `action.functionCall`：未来能力保留，Agent 不应生成，Renderer 不执行。
- 属性脚本 `{ script: { code, deps, fallback } }`：Renderer 当前支持只读计算。

## 8. 依赖关系

```text
shared
  <- agent
  <- backend
  <- frontend
  <- renderer
```

Shared 不应反向 import 任何业务模块。跨模块字段变更应先改 Shared，再改调用方，再更新契约文档。

## 9. 测试与验收

- `pnpm --filter @a2ui-platform/shared typecheck`
- `pnpm --filter @a2ui-platform/shared test`
- 跨模块 DTO 应从 `@a2ui-platform/shared` 导入，不在业务模块重复定义。
- 修改 union 类型后，应检查所有 switch/事件分发/消息处理路径是否穷尽。

## 10. 维护规则

- 所有导出的函数、接口、类型定义应保持中文 JSDoc。
- 修改 API DTO 时，同步更新 [api.md](../../../30-contracts/api.md)。
- 修改 A2UI 类型时，同步更新 [a2ui-v0.9.md](../../../30-contracts/a2ui-v0.9.md)、Agent schema 和 Renderer 文档。
- 修改 SSE 类型时，同步更新 Backend `stream.service.ts` 和 Frontend `stream.ts`。
- 修改 Agent result 或 tool call 类型时，同步更新 Agent、Backend 和 Frontend Runtime 面板文档。

## 11. 相关文档

- [Shared 类型契约](../../../30-contracts/shared-types.md)
- [API 契约](../../../30-contracts/api.md)
- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
