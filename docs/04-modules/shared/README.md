# Shared 模块说明

## 1. 功能定位

`packages/shared` 是跨模块类型包，负责维护 API DTO、A2UI message、SSE event、Agent result、validation result 等共享契约。它是模块之间类型协作的唯一来源。

## 2. 技术栈

- 包路径：`packages/shared`
- 语言：TypeScript
- 构建：tsc
- 测试：Vitest
- 运行依赖：无业务模块依赖

## 3. 职责边界

负责：

- A2UI 类型。
- API 请求/响应 DTO。
- SSE event 类型。
- Agent 输入输出和校验类型。
- 统一导出入口。

不负责：

- 不实现业务逻辑。
- 不访问数据库。
- 不调用模型。
- 不依赖 frontend、renderer、backend、agent。

## 4. 代码工程结构

```text
packages/shared/src/
  a2ui.ts
  agent.ts
  api.ts
  index.ts
  logger.ts
  sse.ts
```

## 5. 文件职责说明

| 文件 | 作用 |
| --- | --- |
| `src/a2ui.ts` | A2UI v0.9 message、component、surface、Catalog 相关类型。 |
| `src/api.ts` | HTTP API request/response DTO 类型。 |
| `src/agent.ts` | Agent 输入、结果、校验、tool call 类型。 |
| `src/sse.ts` | SSE event 类型。 |
| `src/logger.ts` | 共享日志类型或辅助工具。 |
| `src/index.ts` | 统一导出入口。 |

## 6. 关键类型 / 核心对象 / 关键文件

| 名称 | 位置 | 作用 | 为什么重要 |
| --- | --- | --- | --- |
| A2UI 类型 | `src/a2ui.ts` | 定义 A2UI message、surface、component 和 Catalog 类型。 | Agent、Backend、Frontend、Renderer 对 A2UI 的共享语言。 |
| API DTO | `src/api.ts` | 定义 HTTP API 请求和响应类型。 | 前后端接口协作的类型来源。 |
| Agent 类型 | `src/agent.ts` | 定义 Agent 输入、输出、validation result 和 tool call。 | 隔离 Backend 与 Agent Runtime 的关键契约。 |
| SSE 类型 | `src/sse.ts` | 定义服务端推送事件。 | 前端实时状态消费和后端事件广播的共同契约。 |
| 统一导出 | `src/index.ts` | 聚合导出共享类型。 | 业务模块应优先从这里导入跨模块类型。 |

## 7. 依赖契约

- Shared 类型：[../../03-contracts/shared-types.md](../../03-contracts/shared-types.md)
- API：[../../03-contracts/api.md](../../03-contracts/api.md)
- A2UI：[../../03-contracts/a2ui-v0.9.md](../../03-contracts/a2ui-v0.9.md)

## 8. 测试与验收

- `pnpm --filter @a2ui-platform/shared typecheck`
- `pnpm --filter @a2ui-platform/shared test`
- 所有跨模块 DTO 从 `shared` 导入，不在业务模块重复定义。

## 9. 维护规则

- 所有 export 函数、接口、类型定义必须使用中文 JSDoc。
- 跨模块字段变更先改 `shared`，再改调用方。
- 修改 API DTO 同步更新 `docs/03-contracts/api.md`。
- 修改 A2UI 类型同步更新 `docs/03-contracts/a2ui-v0.9.md`。

## 10. 详细档案索引

更细的历史类型规格维护在 `docs/99-archive/shared/`：

- [Shared 类型旧规格](../../99-archive/shared/types-spec.md)
