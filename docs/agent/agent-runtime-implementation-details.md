# Agent Runtime 模块实现详情 v0.1

## 1. 模块概述

`packages/agent` 是受控 Agent Runtime。它使用 OpenAI-compatible API 将用户意图转换为合法 A2UI v0.9 消息，强制执行 validateA2UI 校验，失败时修复重试（最多 3 次），返回结构化结果。

## 2. 文件结构

```text
src/
  index.ts                    # 统一导出
  context/
    context-builder.ts        # AgentContextBuilder
  prompts/
    prompt-composer.ts        # PromptComposer（初始 + 修复 prompt）
  model/
    model-client.ts           # ModelClient（OpenAI-compatible API）
  runtime/
    agent-runtime.ts          # AgentRuntime（状态机）
    output-parser.ts          # parseModelOutput（JSON envelope 解析）
  tools/
    validate-a2ui.ts          # validateA2UI（Ajv + Catalog + 安全校验）
    catalog-schema.ts         # 硬编码 Basic Catalog 组件属性定义
  schemas/
    a2ui-v0.9-schema.json     # A2UI v0.9 消息 JSON Schema
    basic-catalog-schema.json # Basic Catalog 组件属性 JSON Schema
```

## 3. Runtime 状态机

```
PREPARE_CONTEXT  →  GENERATE_DRAFT  →  VALIDATE_DRAFT
                                           ↓
                                      [valid=true, msgs>0] → COMMIT
                                      [valid=true, msgs=0] → TEXT_ONLY
                                      [valid=false] → REPAIR_DRAFT → GENERATE_DRAFT
                                                                          ↓
                                                                     [attempts>3] → FAILED
```

- 最多 3 次尝试（1 次初始 + 2 次修复）
- 每次尝试包含：生成 → 解析 → 校验
- 校验通过且有 A2UI 消息 → COMMITTED
- 校验通过但无 A2UI 消息 → TEXT_ONLY（仅文字回复）
- 3 次后仍失败 → FAILED（不提交任何 A2UI）

## 4. AgentContextBuilder

`buildContext(input: AgentRunInput)` 组装上下文：

1. 当前用户消息
2. 最近 20 条消息历史（格式化为文本）
3. 上传文件内容（截断到 8000 字符/文件）
4. 已启用 skills 内容
5. 当前 surface snapshot JSON 摘要
6. 固定 Catalog 组件名称列表

不读取任意本地路径，只从 AgentRunInput 获取数据。

## 5. PromptComposer

### composeInitial(context)

**System Prompt** 包含：
- 角色定义：A2UI 页面生成助手
- 可用组件列表（从 Catalog 获取）
- 输出 JSON 契约：`{ "assistantMessage": "...", "a2uiMessages": [...] }`
- 禁止事项：不生成 HTML/JS/CSS、不返回 Markdown 包裹 JSON、不使用 Catalog 外组件
- 组件使用规范：adjacency list 结构、root 必须存在、child/children 引用可解析
- 数据绑定说明：`{ "path": "/..." }` JSON Pointer

**User Prompt** 包含：
- 用户需求
- 上下文：文件内容摘要、skills 内容、当前 UI 状态

### composeRepair(context, previousOutput, errors)

- System Prompt = 同初始 + 强调修复
- User Prompt = 上一版 JSON + 错误详情
- 提示："请只修复列出的错误，不要重新设计整个 UI"

## 6. ModelClient

封装 OpenAI-compatible API 非流式调用：

- `POST {baseUrl}/chat/completions`
- Headers：`Authorization: Bearer {apiKey}`、`Content-Type: application/json`
- Body：`{ model, messages, temperature, max_tokens }`
- 使用 AbortController 控制超时
- **决不 log apiKey**
- 返回 `{ content: string; usage?: TokenUsage }`

构造函数参数：`baseUrl`, `apiKey`, `model`, `temperature`, `maxTokens`, `timeoutMs`。

## 7. 模型输出解析

`parseModelOutput(raw: string)`：

1. 去除 Markdown 代码块包裹（```json ... ```）
2. JSON.parse
3. 验证 `assistantMessage` 是 string
4. 验证 `a2uiMessages` 是 array
5. 返回 `{ ok: true, data }` 或 `{ ok: false, error }`

## 8. validateA2UI 完整校验

6 层校验：

| 层级 | 方式 | 内容 |
|------|------|------|
| 1. Schema 校验 | Ajv + a2ui-v0.9-schema.json | 4 种消息类型的基本结构 |
| 2. Catalog 校验 | Ajv + basic-catalog-schema.json | 组件类型存在性、属性合法性 |
| 3. Root 检查 | 代码逻辑 | updateComponents 中必须有 id="root" 的组件 |
| 4. Child 引用 | 代码逻辑 | 所有 child/children 引用的 id 在 components 中存在 |
| 5. Surface 检查 | 代码逻辑 | 目标 surface 已创建（或 currentSnapshot 中有） |
| 6. 安全约束 | 字符串匹配 | 拒绝 `<script`、innerHTML、eval 等 |

返回 `{ valid, errors, warnings, normalizedMessages }`。

## 9. 修复循环策略

每次校验失败后：
1. 收集 errors + warnings
2. 构建 repair prompt（含上一版输出 + 错误详情）
3. 重新调用模型
4. 解析 + 校验
5. attempt 计数 +1
6. 校验通过 → 成功退出
7. 超过 3 次 → FAILED

## 10. Tool Call 记录

每次 validateA2UI 调用后生成 ToolCallRecord：
- `toolName: "validateA2UI"`
- `status: "succeeded" | "failed"`
- `attemptIndex`、`inputSummary`、`output`、`durationMs`
- 通过 `onToolCall(record)` 回调通知 backend

## 11. 配置

默认模型配置：
- model: `gpt-4.1`
- temperature: `0.2`
- maxTokens: `8192`
- timeoutMs: `60000`
- maxAttempts: `3`
