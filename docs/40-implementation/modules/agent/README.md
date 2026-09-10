# Agent 模块说明

## 1. 功能定位

`packages/agent` 是受控 Agent Runtime，负责把后端注入的用户意图、上下文、Skill、文件、历史消息和当前 surface snapshot 转换为结构化 Agent 结果。

Runtime 有两个入口，对应两类运行路径：

- `run(input, onToolCall?)`：普通非 workflow 生成，通过 JSON envelope 解析、按需信息披露、`validateA2UI` 校验和最多 3 次修复，返回 `AgentRunResult`（`COMMITTED` / `TEXT_ONLY` / `FAILED`）。
- `runWorkflowTask(input, onToolCall?, onTraceEvent?)`：workflow-scoped 任务，通过 ReAct 循环（think → act → observe）执行，产出 `AgentWorkflowTaskResult`（含 `ParsedAgentResult`、trace 摘要和 Resource Ledger snapshot）。

普通生成返回三类结果：

- `COMMITTED`：返回 assistant 文本和已通过 `validateA2UI` 的 A2UI server messages。
- `TEXT_ONLY`：返回 assistant 文本，不产生 A2UI messages。
- `FAILED`：返回失败原因、尝试次数和可选校验结果。

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
- 组装普通生成的初始 prompt、修复 prompt、组件详情披露 prompt、Skill 内容披露 prompt 和 Skill Reference 披露 prompt。
- 组装 workflow 任务的 ReAct system prompt 与逐轮 user prompt（goal / facts / observations / currentDraft / working resources / catalog context）。
- 调用 OpenAI-compatible API。
- 普通生成解析模型输出中的 `{ assistantMessage, a2uiMessages }`，并按需披露组件详情、Skill 内容和 Skill Reference。
- workflow 任务以严格 JSON 动作协议（`tool_call` / `final_draft` / `give_up`）执行 ReAct 循环；A2UI 候选结果必须嵌入 `final_draft.draft.messages`，不能以 `{ assistantMessage, a2uiMessages }` 作为顶层输出。
- 维护 Resource Ledger，跨 workflow task 共享已披露 Skill / Reference 并做去重。
- 维护 Catalog Context，保存已披露组件字段规范，供生成和修复 A2UI 时直接引用。
- 调用 `validateA2UI` 校验 A2UI 消息。
- 记录 `validateA2UI`、`getCatalogComponentDetails`、`getSkillContent`、`getSkillReferenceContent`、`askClarification`、`askUserDecision` 等工具调用信息。

不负责：

- 不访问数据库。
- 不读取任意本地文件路径。
- 不开放 HTTP API。
- 不保存消息、A2UI event 或 snapshot。
- 不绕过 `validateA2UI` 提交模型输出。
- 不推进 workflow step 状态、不发送 SSE（由 WorkflowService 负责）。

## 4. 真实工程结构

```text
packages/agent/src/
  index.ts
  logger.ts
  context/
    context-builder.ts
  model/
    model-client.ts
    model-io-logger.ts
  prompts/
    prompt-composer.ts
  runtime/
    agent-runtime.ts
    create-agent-runtime.ts
    output-parser.ts
    workflow-task-parser.ts
    component-info-request-parser.ts
    skill-info-request-parser.ts
    skill-reference-request-parser.ts
    react-agent-types.ts
    react-action-parser.ts
    react-prompt-composer.ts
    workflow-agent-context-builder.ts
    workflow-agent-executor.ts
    tool-registry.ts
    resource-ledger.ts
    __tests__/
  schemas/
    a2ui-v0.9-schema.json
  skills/
    registry.ts
    platform-skills.ts
    a2ui-v0.9-generation.ts
    a2ui-v0.9-generation/
      SKILL.md
      references/
  tools/
    catalog-schema.ts
    validate-a2ui.ts
    __tests__/
```

## 5. 关键文件职责

| 文件 / 目录                                     | 作用                                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                  | 包公共 API 入口，导出 runtime 工厂、解析工具、校验/Catalog 工具和内置 Skill 注册表。                                                                        |
| `src/runtime/create-agent-runtime.ts`           | 对外工厂函数，组装 `ModelClient`、`PromptComposer` 和 `AgentContextBuilder`。                                                                               |
| `src/runtime/agent-runtime.ts`                  | Agent 主循环：普通 `run()` 编排生成、渐进披露、校验、修复；`runWorkflowTask()` 组装 ReAct executor、hydrate Resource Ledger 并把 trace summary 映射为结果。 |
| `src/runtime/react-agent-types.ts`              | ReAct 运行时内部类型：goal / facts / capabilities / limits / draft / observation / 动作与最终产物。                                                         |
| `src/runtime/react-action-parser.ts`            | 解析模型原始输出为单一 `AgentModelAction`（只接受严格 JSON object）。                                                                                       |
| `src/runtime/catalog-context.ts`                | 维护 workflow 单次运行内已披露组件字段规范，并渲染面向生成与修复的 Catalog Context。                                                                        |
| `src/runtime/react-prompt-composer.ts`          | 合成 ReAct 的稳定 system prompt 与逐轮 user prompt（含 Working Resources 与 Catalog Context 分区）。                                                        |
| `src/runtime/workflow-agent-context-builder.ts` | 把 `AgentWorkflowTaskInput` 投影为 executor 输入（goal / facts / capabilities / limits）。                                                                  |
| `src/runtime/workflow-agent-executor.ts`        | ReAct while 循环执行器：模型调用 → 动作解析 → 工具执行 → 观察累积 → 草稿修复，并发出 trace 事件。                                                           |
| `src/runtime/tool-registry.ts`                  | 受控工具注册表（6 个工具），执行参数校验与失败策略，并提供最终产物结构校验辅助。                                                                            |
| `src/tools/catalog-schema.ts`                   | 从 `@a2ui-platform/shared` 的 Basic Catalog Definition 读取组件摘要和字段详情，供渐进披露使用。                                                             |
| `src/tools/validate-a2ui.ts`                    | 校验 A2UI 消息结构、组件引用、安全字段和 Catalog 字段；组件属性 JSON Schema 由 shared Basic Catalog Definition 派生。                                       |
| `src/runtime/resource-ledger.ts`                | 运行时 Resource Ledger：hydrate / dehydrate / record / has，承载已披露 Skill / Reference 正文并做去重。                                                     |
| `src/runtime/workflow-task-parser.ts`           | 旧 workflow 输出的解析器，当前 ReAct 路径已不调用，保留为历史兼容（见 §10 已知差异）。                                                                      |
| `src/runtime/output-parser.ts`                  | 解析模型最终 JSON envelope。                                                                                                                                |
| `src/runtime/component-info-request-parser.ts`  | 解析模型请求 Basic Catalog 组件详情的结构化输出。                                                                                                           |
| `src/runtime/skill-info-request-parser.ts`      | 解析模型请求完整 Skill 内容的结构化输出。                                                                                                                   |
| `src/runtime/skill-reference-request-parser.ts` | 解析模型请求 Skill Reference 正文的结构化输出。                                                                                                             |
| `src/context/context-builder.ts`                | 汇总用户输入、历史消息、上传文件、已启用 Skill、当前 snapshot 和 Catalog 摘要。                                                                             |
| `src/prompts/prompt-composer.ts`                | 生成初始、修复和披露后的 prompt。                                                                                                                           |
| `src/model/model-client.ts`                     | 封装 OpenAI-compatible API 调用、超时和错误处理。                                                                                                           |
| `src/model/model-io-logger.ts`                  | 根据 `MODEL_IO_LOG` 输出模型输入输出摘要、debug 预览和本地 JSONL trace。                                                                                    |
| `src/tools/validate-a2ui.ts`                    | A2UI schema、Catalog、引用和安全约束校验入口。                                                                                                              |
| `src/tools/catalog-schema.ts`                   | Basic Catalog 定义、摘要和详情格式化工具。                                                                                                                  |
| `src/skills/registry.ts`                        | 内置 Skill 元数据源。                                                                                                                                       |
| `src/skills/platform-skills.ts`                 | 平台默认启用 Skill 解析入口。                                                                                                                               |
| `src/skills/a2ui-v0.9-generation.ts`            | 运行时强依赖的 A2UI 生成 Skill 定义。                                                                                                                       |

## 6. 公共 API

`packages/agent/src/index.ts` 当前导出：

- Runtime 工厂：`createAgentRuntime(config)`。
- 输出解析：`parseModelOutput`、`parseComponentInfoRequest`、`parseSkillReferenceRequest`。
- 校验与 Catalog：`validateA2UI`、`getCatalogComponents`、`getCatalogComponentSummaries`、`formatCatalogComponentSummaries`、`formatCatalogComponentDetails`、`getCatalogComponentNames`、`getAllCatalogComponentNames`、`getComponentDef`、`getBasicCatalogDefinition`。
- Skill 注册：`BUILTIN_SKILLS`、`getPlatformAutoEnabledSkills`。

`AgentRuntime`、`ModelClient`、`PromptComposer` 和 `AgentContextBuilder` 是内部实现；后端只应通过 `createAgentRuntime()` 获取 `IAgentRuntime`。

## 7. 核心流程

### 普通生成（`run`）

1. 后端调用 `createAgentRuntime(config).run(input, onToolCall)`。
2. `AgentContextBuilder` 根据后端传入的 `AgentRunInput.enabledSkills` 生成上下文；平台默认 Skill 由后端 Skill Resolver 放入输入。
3. `PromptComposer` 生成初始 prompt，只放入摘要信息，不直接塞满所有组件和 Skill 正文。
4. `AgentRuntime` 调用模型；模型可先请求组件详情、Skill 内容或 Skill Reference。
5. Runtime 最多进行 3 轮渐进式披露，工具调用结果通过 `onToolCall` 回传给后端记录。
6. 模型输出最终 JSON envelope 后，`parseModelOutput` 提取 assistant 文本和 A2UI messages。
7. `validateA2UI` 校验消息；失败时进入 repair prompt，生成和修复总共最多 3 次。
8. 校验通过且有 A2UI messages 时返回 `COMMITTED`；校验通过但无 A2UI messages 时返回 `TEXT_ONLY`；仍失败则返回 `FAILED`。

### workflow task（`runWorkflowTask`）

1. 后端调用 `createAgentRuntime(config).runWorkflowTask(input, onToolCall, onTraceEvent)`。
2. `AgentContextBuilder` 生成基础上下文；`WorkflowAgentContextBuilder` 把 `AgentWorkflowTaskInput` 投影为 goal / facts / capabilities / limits。
3. `hydrateResourceLedger` 用上一 task 的 snapshot 与当前 `enabledSkills` 恢复运行时 Resource Ledger，丢弃资源记入 debug 诊断。
4. `AgentRuntime` 注入 `ToolRegistry`（Skill 内容来自已构建上下文）并构造 `WorkflowAgentExecutor`。
5. `WorkflowAgentExecutor` 运行 ReAct while 循环：`ReactPromptComposer` 合成 prompt → 模型输出 → `parseAgentAction` 解析动作 → `ToolRegistry.execute` 执行工具 → 观察累积 → final_draft 校验（candidate 强制 `validateA2UI`）。
6. 每轮迭代通过 `onTraceEvent` 发出 trace 事件，后端零转换转发为 `agent_trace_event` SSE。
7. 执行结束把最终产物映射为 `ParsedAgentResult`，从 trace 提取 `ToolCallRecord`，并把运行时 ledger 脱水为 `ResourceLedgerSnapshot`。

Workflow 路径的模型输出约束：

- 顶层必须是 ReAct action envelope，不能直接输出普通生成路径的 `{ assistantMessage, a2uiMessages }`。
- 生成候选 A2UI 时，`finalKind` 必须是 `candidate_a2ui_messages`，A2UI 消息数组必须放在 `draft.messages`。
- `draft.assistantMessage` 可作为候选说明文本，由 Runtime 映射到候选 artifact 的说明字段。
- `builtin:a2ui-v0.9-generation` 在 workflow prompt 中注入时，应描述 A2UI payload 在 ReAct draft 内的位置，避免和普通 `run()` 输出协议冲突。

## 7.1 Model IO Logging

`ModelClient.generate(messages, traceContext?)` 统一接入 Model IO Logging（模型输入输出日志），因此普通 `run()`、Workflow `runWorkflowTask()`、修复和渐进披露路径都会经过同一个模型 IO 记录点。

环境变量：

- `MODEL_IO_LOG=off`：关闭模型 IO 日志。
- `MODEL_IO_LOG=summary`：终端输出 request / response / error 摘要。
- `MODEL_IO_LOG=debug`：终端输出摘要和截断后的输入输出预览。
- `MODEL_IO_LOG=full`：终端输出摘要，并写入 `logs/model-io/YYYY-MM-DD.jsonl`。
- `AGENT_ROUND_DUMP=1|true|on|yes`：独立开关，每次模型调用后把原始 messages 与原始回复追写到 `logs/agent-io/<sessionId>.txt`；与 `MODEL_IO_LOG` 相互独立。

实现约束：

- `traceContext` 是可选诊断上下文，缺失字段不影响模型调用。
- JSONL 与原始追写写入前会执行基础密钥脱敏。
- 日志失败只输出 warn，不改变模型调用成功或失败语义。

## 8. 渐进式披露规则

以下规则只适用于普通 `run()` 路径。workflow `runWorkflowTask()` 路径改用 ReAct 工具（`getSkillContent`、`getSkillReferenceContent`、`getCatalogComponentDetails`）+ Resource Ledger 做披露与去重，不再使用 `skillInfoRequest` / `skillReferenceRequest` / `componentInfoRequest` 文本协议。

- 初始 prompt 只包含 Skill 摘要、Reference 摘要和 Catalog 组件摘要。
- 模型需要完整 Skill 正文时输出 `skillInfoRequest`，Runtime 只能从本次 `AgentRunInput.enabledSkills` 和运行时内建 Skill 中匹配。
- 模型需要 Reference 正文时输出 `skillReferenceRequest`，Runtime 先匹配 Skill，再匹配 Reference；`references: ["*"]` 表示披露该 Skill 下所有 Reference。
- 模型需要组件字段详情时输出 `componentInfoRequest`，Runtime 从 Basic Catalog 中匹配并注入详情。
- 已披露过的 Skill、Reference 或组件不会重复注入。
- 达到披露轮次上限后，Runtime 会强制要求模型输出最终 `{ assistantMessage, a2uiMessages }`。

`builtin:a2ui-v0.9-generation` 的平台 Reference 当前采用两段式结构：

- `a2ui-generation-standards`：生成 UI 前必须请求，包含符合 Renderer 的 A2UI 消息结构、组件树、dataModel、交互、JSRuntime、安全边界、bad case 和输出检查。
- `high-quality-a2ui-good-cases`：复杂 UI 或需要质量标杆时请求，包含来自 Renderer 能力 demo 的 Music Player、Finance Brief 和 Work Board 三个完整 good case。

### workflow Catalog Context

Workflow 路径中，`getCatalogComponentDetails` 的结果不应作为大段 observation 正文长期回放。组件详情是生成约束，应进入独立 Catalog Context 分区。

Catalog Context 的推荐渲染方式：

- 按组件名称分组。
- 列出允许字段、必填字段、枚举值和动态绑定形状。
- 对常见混淆字段给出禁止说明，例如 `TextField` 使用 `text` 绑定输入值，`CheckBox` 使用布尔 `value`，`Text` 使用 `text` 展示内容。
- Observation 只保留工具执行摘要，避免把组件规范混入时间线日志。

`validateA2UI` 失败反馈应尽量保留结构化诊断：组件 ID、组件类型、错误 path、多余字段名、期望类型、实际值摘要和修复提示。这样 executor 下一轮能基于 `currentDraft + Catalog Context + structured validation errors` 做局部修复。

## 8.1 A2UI 脚本路径作用域方案

A2UI v0.9 生成规则中的 `path` 需要区分两层语义：

- 底层 `DataModel` 仍使用 JSON Pointer（JSON 指针）作为实际读写和订阅路径，例如 `/todo/items/0/done`。
- 组件协议中的动态绑定、属性脚本和 `action.script` 面向 Agent 生成时使用 DataContext 作用域路径：以 `/` 开头表示绝对路径；不以 `/` 开头表示相对当前组件 `basePath`。

本方案用于修复 List 模板 item 级属性脚本与普通 `{ "path": "done" }` 绑定规则不一致的问题。动态 `List` 会为每个 item 建立独立 `basePath`，例如 `/todo/items/0`。因此同一个 item 模板内：

```json
{ "path": "done" }
```

```js
dataModel.get("done");
```

```json
"deps": ["done"]
```

都应解析为 `/todo/items/0/done`；而 `dataModel.get("/todo/items")` 和 `"deps": ["/todo/items"]` 仍表示绝对路径。

Renderer 实施约束：

- 属性脚本执行时注入的 `dataModel.get(path)` 必须通过当前 `DataContext.resolvePath(path)` 规整后再读取底层 `DataModel`。
- `action.script` 注入的 `dataModel.get(path)` 和 `dataModel.set(path, value)` 必须同样走当前 `DataContext.resolvePath(path)`。
- 属性脚本 `deps` 必填且最多 32 个；每个 dep 允许绝对路径或相对路径，订阅前必须规整为绝对 JSON Pointer。
- `action.script.deps` 仍不参与响应式订阅，但校验规则应与属性脚本路径一致，避免 Agent 生成两套路径心智。
- 脚本路径只改变 dataModel 路径解析，不扩大 JSRuntime 能力边界；DOM、window、document、fetch、网络、定时器、import、async/await、eval、Function、Promise 和外部 API 仍禁止。

Agent 生成约束：

- List / Grid 动态模板内读取当前 item 字段时，可以生成相对 `{ "path": "title" }`、`dataModel.get("done")` 和 `deps: ["done"]`。
- 需要读写整个集合、全局筛选状态或跨 item 状态时，继续使用绝对路径，例如 `/todo/items`、`/finance/selectedCategory`。
- 属性脚本必须保持短小、同步、确定性，并提供 `fallback`；属性脚本只读取，不写入。
- item 级按钮如果需要当前 item id，优先用 `action.script.context` 传入 `{ "path": "id" }`，脚本正文再用绝对路径更新集合，或在只修改当前 item 局部字段时使用相对 `dataModel.set("done", next)`。

回归测试要求：

- List item 内属性脚本使用 `dataModel.get("done")` 和 `deps: ["done"]` 时，应读取当前 item 并随当前 item 字段变化刷新。
- List item 内 `action.script` 使用相对 `dataModel.get/set` 时，应只影响当前 item。
- 绝对路径脚本保持兼容，现有 `/count`、`/score`、`/todo/items` 用例不得回退。
- 相对 `deps` 不应触发 `SCRIPT_DEP_INVALID`，脚本 fallback 只应在脚本正文异常或返回值非法时生效。

## 9. 测试与验收

- `pnpm --filter @a2ui-platform/agent typecheck`
- `pnpm --filter @a2ui-platform/agent test`
- 非 JSON 输出应被捕获并进入修复或失败分支。
- Catalog 外组件应被拒绝或进入修复。
- 校验失败最多尝试 3 次。
- `TEXT_ONLY` 不应产生 A2UI event。
- Skill 内容和 Skill Reference 应按需披露，且不能访问数据库或任意本地路径。
- ReAct 动作解析（`react-action-parser`）、prompt 合成（`react-prompt-composer`）、工具注册表（`tool-registry`）、Resource Ledger 与 executor 均有单测覆盖。

## 10. 维护规则

- 修改 Agent result 类型时，同步更新 [shared-types.md](../../../30-contracts/shared-types.md)。
- 修改 A2UI 校验或生成边界时，同步更新 [a2ui-v0.9.md](../../../30-contracts/a2ui-v0.9.md) 和 Renderer 文档。
- 修改 Skill 披露流程时，同步更新 Backend、Frontend Runtime 面板和 Integration 文档。
- 新增内置 Skill 时，先更新 `src/skills/registry.ts`，再确认后端同步脚本和前端展示策略。

已知差异：

- `agent-runtime.ts` 中的 `composeWorkflowTaskPrompt` 私有方法与 `workflow-task-parser.ts` 的 `parseWorkflowTaskOutput` 是 ReAct 迁移前的遗留代码，当前 `runWorkflowTask()` 已改用 `WorkflowAgentExecutor`，二者不再被调用。
- 普通 `run()` 仍使用 `skillInfoRequest` / `skillReferenceRequest` / `componentInfoRequest` 文本协议，而 workflow `runWorkflowTask()` 使用 ReAct 工具 + Resource Ledger，两条路径的披露机制不同。

## 11. 相关文档

- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Shared 类型契约](../../../30-contracts/shared-types.md)
- [Backend 模块说明](../backend/README.md)
- [Integration 模块说明](../integration/README.md)
