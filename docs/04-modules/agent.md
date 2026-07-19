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
    prompt-composer.ts
  skills/
    a2ui-v0.9-generation.md
    a2ui-v0.9-generation.ts
    hello-world.md
    registry.ts
  runtime/
    agent-runtime.ts
    create-agent-runtime.ts
    component-info-request-parser.ts
    skill-info-request-parser.ts
    output-parser.ts
    progressive-disclosure.test.ts
    create-agent-runtime.test.ts
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
| `src/index.ts` | Agent 包公共 API 入口，只暴露工厂函数、解析工具和校验/Catalog 工具。 |
| `src/logger.ts` | Agent 日志辅助。 |
| `src/context/context-builder.ts` | 构建 Agent 上下文，汇总用户输入、历史消息、文件、skills、snapshot 和 Catalog 摘要。 |
| `src/model/model-client.ts` | OpenAI-compatible API 客户端，负责模型请求与错误处理。 |
| `src/prompts/prompt-composer.ts` | 拼装 system prompt、user prompt 和 repair prompt；只注入 Agent 身份、工作流、输出通道、安全边界和按需披露内容。 |
| `src/skills/a2ui-v0.9-generation.md` | A2UI v0.9 组件消息生成 Skill 内容，供内置 Skill 同步和前端展示。 |
| `src/skills/a2ui-v0.9-generation.ts` | A2UI v0.9 组件消息生成 Skill 的运行时内建定义，保证 Agent 不依赖会话启用即可请求该基础能力。 |
| `src/runtime/agent-runtime.ts` | Runtime 主状态机，实现 `IAgentRuntime` 接口，协调上下文、模型调用、解析、校验、组件信息披露和修复循环。 |
| `src/runtime/create-agent-runtime.ts` | **工厂函数（唯一对外暴露的运行时 API）**，封装 ModelClient、PromptComposer、AgentContextBuilder 的创建与组装。 |
| `src/runtime/output-parser.ts` | 解析模型输出中的 JSON envelope。 |
| `src/runtime/component-info-request-parser.ts` | 解析模型对组件详情的结构化请求。 |
| `src/runtime/skill-info-request-parser.ts` | 解析模型对 Skill 内容的结构化请求。 |
| `src/runtime/progressive-disclosure.test.ts` | 组件信息渐进式披露流程测试。 |
| `src/runtime/create-agent-runtime.test.ts` | 工厂函数测试。 |
| `src/schemas/a2ui-v0.9-schema.json` | A2UI v0.9 JSON Schema。 |
| `src/schemas/basic-catalog-schema.json` | Basic Catalog JSON Schema。 |
| `src/tools/catalog-schema.ts` | Catalog 组件定义、详情查询和 schema 辅助。 |
| `src/tools/validate-a2ui.ts` | A2UI 校验入口，执行 schema、Catalog、引用和安全约束校验。 |
| `src/tools/validate-a2ui.test.ts` | A2UI 校验测试。 |

## 6. 关键类 / 核心对象 / 关键文件

| 名称 | 位置 | 作用 | 为什么重要 |
| --- | --- | --- | --- |
| `createAgentRuntime` | `src/runtime/create-agent-runtime.ts` | 创建 `IAgentRuntime` 实例。 | 后端唯一需要依赖的 Agent Runtime 工厂 API。 |
| `AgentRuntime` | `src/runtime/agent-runtime.ts` | 协调上下文构建、模型调用、输出解析、校验和修复循环。 | Agent 生成 A2UI 的主状态机。 |
| `AgentContextBuilder` | `src/context/context-builder.ts` | 汇总用户输入、历史、文件、skills、snapshot 和 Catalog 摘要。 | 决定模型可见上下文的边界。 |
| `PromptComposer` | `src/prompts/prompt-composer.ts` | 拼装初始 prompt、组件详情 prompt、Skill 详情 prompt 和 repair prompt。 | 控制模型输出格式和修复策略。 |
| `ModelClient` | `src/model/model-client.ts` | 调用 OpenAI-compatible API。 | Agent 与模型服务之间的隔离层。 |
| `validateA2UI` | `src/tools/validate-a2ui.ts` | 校验 A2UI schema、Catalog、引用和安全约束。 | 保证后端只提交合法 A2UI 消息的关键工具。 |
| `BUILTIN_SKILLS` | `src/skills/registry.ts` | 声明内置 Skill 元数据。 | 后端同步内置 Skill 的数据源。 |

## 7. 公共 API 与模块边界

Agent 包通过 `index.ts` 暴露三层公共 API：

**运行时入口**（后端唯一需要的 API）：

- `createAgentRuntime(config)` → `IAgentRuntime`：工厂函数，封装内部 ModelClient、PromptComposer、AgentContextBuilder 的组装。

**解析工具**：

- `parseModelOutput(raw)` → 解析模型 JSON 输出。
- `parseComponentInfoRequest(raw)` → 解析组件详情请求。

**校验与 Catalog 工具**：

- `validateA2UI(input)` → A2UI 消息校验。
- `getCatalogComponents()` 等 Catalog 查询函数。

**不暴露的类**：`AgentRuntime`、`ModelClient`、`PromptComposer`、`AgentContextBuilder` 均为内部实现。外部只能通过 `IAgentRuntime` 接口与 `createAgentRuntime()` 工厂使用 Agent。

**接口契约**：`IAgentRuntime`、`AgentRuntimeFactoryConfig` 定义在 `packages/shared/src/agent.ts` 中。任何替代 Agent 实现只需实现 `IAgentRuntime` 接口并提供同签名工厂函数即可替换。

## 8. 核心流程

1. `AgentRuntime` 接收后端传入的运行输入。
2. `ContextBuilder` 构建上下文，并合并始终可用的 `builtin:a2ui-v0.9-generation` 基础 Skill。
3. `PromptComposer` 生成初始 prompt，说明 Agent 身份、工作流和输出通道，不直接注入完整 A2UI 协议生成指南。
4. `ModelClient` 调用模型。
5. 如果模型请求 Skill 内容，Runtime 通过 `getSkillContent` 披露完整 Markdown 内容并继续生成。
6. 如果模型请求组件详情，Runtime 通过 `catalog-schema.ts` 获取详情并继续生成。
7. `OutputParser` 解析最终 `{ assistantMessage, a2uiMessages }`。
8. 如果返回 A2UI messages，调用 `validateA2UI`。
9. 校验失败时构建 repair prompt，最多重试 3 次。
10. 成功返回合法 messages，失败返回结构化错误。

## 9. Runtime 状态

- `PREPARE_CONTEXT`
- `GENERATE_DRAFT`
- `VALIDATE_DRAFT`
- `REPAIR_DRAFT`
- `COMMIT`
- `FAILED`

## 10. Skill 渐进式披露

- 初始 Prompt 只包含已启用 Skill 的 `id`、`name` 和 `description` 摘要，不直接注入完整 `content`。
- 当模型需要完整 Skill 规则时，输出 `skillInfoRequest`，由 Runtime 从本次 `AgentRunInput.enabledSkills` 中按 `id` 优先、`name` 其次精确匹配。
- Runtime 通过 `getSkillContent` 工具调用记录披露结果，并把匹配到的 Markdown 内容注入下一轮 Prompt。
- A2UI 生成能力通过 `builtin:a2ui-v0.9-generation` 基础 Skill 提供；该 Skill 由 Runtime 始终内建注入，即使后端未为 session 启用任何 Skill 也可请求。
- Runtime 不访问数据库、不读取本地文件、不执行 Skill 脚本；Skill 内容来自后端传入的启用 Skill 列表和 Runtime 内建基础 Skill。
- Skill 内容披露和组件详情披露共用渐进式披露轮次，达到上限后强制输出最终 `{ assistantMessage, a2uiMessages }`。

## 11. 输出契约

模型最终必须返回：

```json
{
  "assistantMessage": "说明文本",
  "a2uiMessages": []
}
```

`a2uiMessages` 非空时必须经过 `validateA2UI`。

最终 `assistantMessage` 应先简要复述 Agent 对用户需求的理解，再说明生成或修改结果，对应工作流中的“向用户确认自己的理解”。

## 12. 依赖契约

- A2UI：[../03-contracts/a2ui-v0.9.md](../03-contracts/a2ui-v0.9.md)
- Shared 类型：[../03-contracts/shared-types.md](../03-contracts/shared-types.md)
- Backend 提交：[./backend.md](./backend.md)

## 13. 测试与验收

- `pnpm --filter @a2ui-platform/agent typecheck`
- `pnpm --filter @a2ui-platform/agent test`
- 成功输出只包含通过校验的 A2UI messages。
- 非 JSON 输出被捕获。
- Catalog 外组件被拒绝或修复。
- 失败 3 次后返回 `FAILED`。
- Agent 不读取任意本地路径。

## 14. 维护规则

- 修改 Prompt 或输出契约时，同步更新 `docs/03-contracts/a2ui-v0.9.md`。
- 修改 Agent result 类型时，同步更新 `docs/03-contracts/shared-types.md`。
- 修改校验规则时，同步更新 Renderer 和 Backend 相关说明。

## 15. 详细档案索引

更细的历史设计和实现细节维护在 `docs/99-archive/agent/`：

- [上下文编排与组成](../99-archive/agent/context-orchestration.md)
- [Agent LLM A2UI 生成指南](../99-archive/agent/agent-llm-a2ui-guide.md)
- [Runtime 实施说明](../99-archive/agent/runtime-implementation.md)
- [Runtime 实现细节](../99-archive/agent/runtime-implementation-details.md)
