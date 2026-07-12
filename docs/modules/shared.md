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

## 6. 依赖契约

- Shared 类型：[../contracts/shared-types.md](../contracts/shared-types.md)
- API：[../contracts/api.md](../contracts/api.md)
- A2UI：[../contracts/a2ui-v0.9.md](../contracts/a2ui-v0.9.md)

## 7. 测试与验收

- `pnpm --filter @a2ui-platform/shared typecheck`
- `pnpm --filter @a2ui-platform/shared test`
- 所有跨模块 DTO 从 `shared` 导入，不在业务模块重复定义。

## 8. 维护规则

- 所有 export 函数、接口、类型定义必须使用中文 JSDoc。
- 跨模块字段变更先改 `shared`，再改调用方。
- 修改 API DTO 同步更新 `docs/contracts/api.md`。
- 修改 A2UI 类型同步更新 `docs/contracts/a2ui-v0.9.md`。

## 9. 详细档案索引

更细的历史类型规格维护在 `docs/archive/shared/`：

- [Shared 类型旧规格](../archive/shared/types-spec.md)
