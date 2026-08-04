# Agent 模块说明

## 1. 功能定位

`packages/agent` 是受控 Agent Runtime，负责把后端注入的用户意图、上下文、Skill、文件、历史消息和当前 surface snapshot 转换为结构化 Agent 结果。

它的核心职责不是“直接生成页面”，而是通过 OpenAI-compatible API 调用模型，再对模型输出做 JSON envelope 解析、按需信息披露、A2UI v0.9 校验和最多 3 次修复，最终返回以下三类结果：

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
- 组装初始 prompt、修复 prompt、组件详情披露 prompt、Skill 内容披露 prompt 和 Skill Reference 披露 prompt。
- 调用 OpenAI-compatible API。
- 解析模型输出中的 `{ assistantMessage, a2uiMessages }`。
- 解析模型发出的 `componentInfoRequest`、`skillInfoRequest` 和 `skillReferenceRequest`。
- 调用 `validateA2UI` 校验 A2UI 消息。
- 记录 `validateA2UI`、`getCatalogComponentDetails`、`getSkillContent`、`getSkillReferenceContent` 等工具调用信息。

不负责：

- 不访问数据库。
- 不读取任意本地文件路径。
- 不开放 HTTP API。
- 不保存消息、A2UI event 或 snapshot。
- 不绕过 `validateA2UI` 提交模型输出。

## 4. 真实工程结构

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
  runtime/
    agent-runtime.ts
    create-agent-runtime.ts
    component-info-request-parser.ts
    skill-info-request-parser.ts
    skill-reference-request-parser.ts
    output-parser.ts
    __tests__/
  schemas/
    a2ui-v0.9-schema.json
    basic-catalog-schema.json
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

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/index.ts` | 包公共 API 入口，导出 runtime 工厂、解析工具、校验/Catalog 工具和内置 Skill 注册表。 |
| `src/runtime/create-agent-runtime.ts` | 对外工厂函数，组装 `ModelClient`、`PromptComposer` 和 `AgentContextBuilder`。 |
| `src/runtime/agent-runtime.ts` | Agent 主循环，负责编排生成、渐进披露、校验、修复和结果返回。 |
| `src/runtime/output-parser.ts` | 解析模型最终 JSON envelope。 |
| `src/runtime/component-info-request-parser.ts` | 解析模型请求 Basic Catalog 组件详情的结构化输出。 |
| `src/runtime/skill-info-request-parser.ts` | 解析模型请求完整 Skill 内容的结构化输出。 |
| `src/runtime/skill-reference-request-parser.ts` | 解析模型请求 Skill Reference 正文的结构化输出。 |
| `src/context/context-builder.ts` | 汇总用户输入、历史消息、上传文件、已启用 Skill、当前 snapshot 和 Catalog 摘要。 |
| `src/prompts/prompt-composer.ts` | 生成初始、修复和披露后的 prompt。 |
| `src/model/model-client.ts` | 封装 OpenAI-compatible API 调用、超时和错误处理。 |
| `src/tools/validate-a2ui.ts` | A2UI schema、Catalog、引用和安全约束校验入口。 |
| `src/tools/catalog-schema.ts` | Basic Catalog 定义、摘要和详情格式化工具。 |
| `src/skills/registry.ts` | 内置 Skill 元数据源。 |
| `src/skills/platform-skills.ts` | 平台默认启用 Skill 解析入口。 |
| `src/skills/a2ui-v0.9-generation.ts` | 运行时强依赖的 A2UI 生成 Skill 定义。 |

## 6. 公共 API

`packages/agent/src/index.ts` 当前导出：

- Runtime 工厂：`createAgentRuntime(config)`。
- 输出解析：`parseModelOutput`、`parseComponentInfoRequest`、`parseSkillReferenceRequest`。
- 校验与 Catalog：`validateA2UI`、`getCatalogComponents`、`getCatalogComponentSummaries`、`formatCatalogComponentSummaries`、`formatCatalogComponentDetails`、`getCatalogComponentNames`、`getAllCatalogComponentNames`、`getComponentDef`、`getBasicCatalogDefinition`。
- Skill 注册：`BUILTIN_SKILLS`、`getPlatformAutoEnabledSkills`。

`AgentRuntime`、`ModelClient`、`PromptComposer` 和 `AgentContextBuilder` 是内部实现；后端只应通过 `createAgentRuntime()` 获取 `IAgentRuntime`。

## 7. 核心流程

1. 后端调用 `createAgentRuntime(config).run(input, onToolCall)`。
2. `AgentContextBuilder` 生成上下文，并注入运行时默认启用的 `builtin:a2ui-v0.9-generation`。
3. `PromptComposer` 生成初始 prompt，只放入摘要信息，不直接塞满所有组件和 Skill 正文。
4. `AgentRuntime` 调用模型；模型可先请求组件详情、Skill 内容或 Skill Reference。
5. Runtime 最多进行 3 轮渐进式披露，工具调用结果通过 `onToolCall` 回传给后端记录。
6. 模型输出最终 JSON envelope 后，`parseModelOutput` 提取 assistant 文本和 A2UI messages。
7. `validateA2UI` 校验消息；失败时进入 repair prompt，生成和修复总共最多 3 次。
8. 校验通过且有 A2UI messages 时返回 `COMMITTED`；校验通过但无 A2UI messages 时返回 `TEXT_ONLY`；仍失败则返回 `FAILED`。

## 8. 渐进式披露规则

- 初始 prompt 只包含 Skill 摘要、Reference 摘要和 Catalog 组件摘要。
- 模型需要完整 Skill 正文时输出 `skillInfoRequest`，Runtime 只能从本次 `AgentRunInput.enabledSkills` 和运行时内建 Skill 中匹配。
- 模型需要 Reference 正文时输出 `skillReferenceRequest`，Runtime 先匹配 Skill，再匹配 Reference；`references: ["*"]` 表示披露该 Skill 下所有 Reference。
- 模型需要组件字段详情时输出 `componentInfoRequest`，Runtime 从 Basic Catalog 中匹配并注入详情。
- 已披露过的 Skill、Reference 或组件不会重复注入。
- 达到披露轮次上限后，Runtime 会强制要求模型输出最终 `{ assistantMessage, a2uiMessages }`。

## 9. 测试与验收

- `pnpm --filter @a2ui-platform/agent typecheck`
- `pnpm --filter @a2ui-platform/agent test`
- 非 JSON 输出应被捕获并进入修复或失败分支。
- Catalog 外组件应被拒绝或进入修复。
- 校验失败最多尝试 3 次。
- `TEXT_ONLY` 不应产生 A2UI event。
- Skill 内容和 Skill Reference 应按需披露，且不能访问数据库或任意本地路径。

## 10. 维护规则

- 修改 Agent result 类型时，同步更新 [shared-types.md](../../../30-contracts/shared-types.md)。
- 修改 A2UI 校验或生成边界时，同步更新 [a2ui-v0.9.md](../../../30-contracts/a2ui-v0.9.md) 和 Renderer 文档。
- 修改 Skill 披露流程时，同步更新 Backend、Frontend Runtime 面板和 Integration 文档。
- 新增内置 Skill 时，先更新 `src/skills/registry.ts`，再确认后端同步脚本和前端展示策略。

## 11. 相关文档

- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Shared 类型契约](../../../30-contracts/shared-types.md)
- [Backend 模块说明](../backend/README.md)
- [Integration 模块说明](../integration/README.md)


