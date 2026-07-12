# Agent 模块说明

## 1. 功能定位

`packages/agent` 是受控 Agent Runtime，负责把用户意图转换成合法 A2UI v0.9 消息。它通过上下文构建、Prompt、模型调用、输出解析、`validateA2UI` 和修复循环，保证返回给后端的成功结果已经通过校验。

输入：后端注入的用户输入、历史消息、上传文件、skills、当前 snapshot、Catalog 信息和模型配置。  
输出：结构化 Agent 成功或失败结果。

## 2. 技术栈

- 包路径：`packages/agent`
- Runtime：Node.js
- 语言：TypeScript
- 模型接口：OpenAI-compatible API
- 校验：Ajv、Zod
- 测试：Vitest、tsc
- 依赖模块：`@a2ui-platform/shared`

## 3. 职责边界

负责：

- 构建 Agent 上下文。
- 组织初始 prompt、组件详情 prompt 和 repair prompt。
- 调用 OpenAI-compatible API。
- 解析模型 JSON envelope。
- 调用 `validateA2UI`。
- 最多 3 次生成/修复。
- 返回结构化成功或失败结果。

不负责：

- 不直接访问任意本地路径。
- 不直接写数据库。
- 不直接写前端状态。
- 不开放 HTTP API。
- 不提供外部 HTTP/API 工具。
- 不绕过校验提交 A2UI。

## 4. 代码工程结构

```text
packages/agent/src/
  index.ts
  logger.ts
  context/
    context-builder.ts
  model/
    model-client.ts
  prompts/
    a2ui-protocol-guide.ts
    prompt-composer.ts
  runtime/
    agent-runtime.ts
    component-info-request-parser.ts
    output-parser.ts
    progressive-disclosure.test.ts
  schemas/
    a2ui-v0.9-schema.json
    basic-catalog-schema.json
  tools/
    catalog-schema.ts
    validate-a2ui.ts
    validate-a2ui.test.ts
```

## 5. 文件职责说明

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/index.ts` | Agent 包导出入口。 |
| `src/logger.ts` | Agent 日志辅助。 |
| `src/context/context-builder.ts` | 构建 Agent 上下文，汇总用户输入、历史消息、文件、skills、snapshot 和 Catalog 摘要。 |
| `src/model/model-client.ts` | OpenAI-compatible API 客户端，负责模型请求与错误处理。 |
| `src/prompts/prompt-composer.ts` | 拼装 system prompt、user prompt、组件详情 prompt 和 repair prompt。 |
| `src/prompts/a2ui-protocol-guide.ts` | A2UI 协议教学内容，包括输出 envelope、消息顺序、组件规则、常见错误和示例。 |
| `src/runtime/agent-runtime.ts` | Runtime 主状态机，协调上下文、模型调用、解析、校验、组件信息披露和修复循环。 |
| `src/runtime/output-parser.ts` | 解析模型输出中的 JSON envelope。 |
| `src/runtime/component-info-request-parser.ts` | 解析模型对组件详情的结构化请求。 |
| `src/runtime/progressive-disclosure.test.ts` | 组件信息渐进式披露流程测试。 |
| `src/schemas/a2ui-v0.9-schema.json` | A2UI v0.9 JSON Schema。 |
| `src/schemas/basic-catalog-schema.json` | Basic Catalog JSON Schema。 |
| `src/tools/catalog-schema.ts` | Catalog 组件定义、详情查询和 schema 辅助。 |
| `src/tools/validate-a2ui.ts` | A2UI 校验入口，执行 schema、Catalog、引用和安全约束校验。 |
| `src/tools/validate-a2ui.test.ts` | A2UI 校验测试。 |

## 6. 核心流程

1. `AgentRuntime` 接收后端传入的运行输入。
2. `ContextBuilder` 构建上下文。
3. `PromptComposer` 生成初始 prompt。
4. `ModelClient` 调用模型。
5. `OutputParser` 解析 `{ assistantMessage, a2uiMessages }`。
6. 如果模型请求组件详情，Runtime 通过 `catalog-schema.ts` 获取详情并继续生成。
7. 如果返回 A2UI messages，调用 `validateA2UI`。
8. 校验失败时构建 repair prompt，最多重试 3 次。
9. 成功返回合法 messages，失败返回结构化错误。

## 7. Runtime 状态

- `PREPARE_CONTEXT`
- `GENERATE_DRAFT`
- `VALIDATE_DRAFT`
- `REPAIR_DRAFT`
- `COMMIT`
- `FAILED`

## 8. 输出契约

模型最终必须返回：

```json
{
  "assistantMessage": "说明文本",
  "a2uiMessages": []
}
```

`a2uiMessages` 非空时必须经过 `validateA2UI`。

## 9. 依赖契约

- A2UI：[../contracts/a2ui-v0.9.md](../contracts/a2ui-v0.9.md)
- Shared 类型：[../contracts/shared-types.md](../contracts/shared-types.md)
- Backend 提交：[./backend.md](./backend.md)

## 10. 测试与验收

- `pnpm --filter @a2ui-platform/agent typecheck`
- `pnpm --filter @a2ui-platform/agent test`
- 成功输出只包含通过校验的 A2UI messages。
- 非 JSON 输出被捕获。
- Catalog 外组件被拒绝或修复。
- 失败 3 次后返回 `FAILED`。
- Agent 不读取任意本地路径。

## 11. 维护规则

- 修改 Prompt 或输出契约时，同步更新 `docs/contracts/a2ui-v0.9.md`。
- 修改 Agent result 类型时，同步更新 `docs/contracts/shared-types.md`。
- 修改校验规则时，同步更新 Renderer 和 Backend 相关说明。
