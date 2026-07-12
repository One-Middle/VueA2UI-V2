# Agent 包：LLM 生成 A2UI 信息引导机制

## 概述

`packages/agent` 负责将用户的自然语言需求转化为符合 A2UI v0.9 规范的 JSON 消息。整个流程由 **AgentRuntime** 编排，核心分五个阶段：**上下文构建 → Prompt 拼装 → 模型调用 → 输出解析 → 校验**，最多重试 3 次。

---

## 文件结构

```
packages/agent/src/
├── index.ts                        # 统一导出入口
├── logger.ts                       # 日志工具（pino）
├── context/
│   └── context-builder.ts          # 上下文构建器
├── prompts/
│   ├── prompt-composer.ts          # Prompt 拼装器
│   └── a2ui-protocol-guide.ts      # A2UI 协议指南（System Prompt 核心）
├── model/
│   └── model-client.ts             # OpenAI-compatible API 客户端
├── runtime/
│   ├── agent-runtime.ts            # Agent 运行时（主流程编排）
│   │   └── output-parser.ts        # 模型输出解析器
│   ├── component-info-request-parser.ts  # 组件信息请求解析器
│   └── progressive-disclosure.test.ts    # 渐进式披露测试
├── tools/
│   ├── validate-a2ui.ts            # A2UI 校验器（Ajv）
│   └── catalog-schema.ts           # Basic Catalog 组件定义
└── schemas/
    ├── a2ui-v0.9-schema.json       # A2UI v0.9 消息结构 JSON Schema
    └── basic-catalog-schema.json   # Basic Catalog 18 个组件属性 JSON Schema
```

---

## 一、上下文构建（AgentContextBuilder）

**文件：** [context-builder.ts](../packages/agent/src/context/context-builder.ts)

将 `AgentRunInput` 转换成一个结构化的 `AgentContext`，包含 6 个部分：

| 字段 | 来源 | 说明 |
| ---- | ---- | ---- |
| `userMessage` | 用户输入 | 原始自然语言需求 |
| `recentMessages` | 最近 20 条对话 | 角色翻译为中文（用户/助手/系统），单条超过 2000 字符会截断 |
| `uploadedFiles` | 上传的 `.txt` 文件 | 每个文件内容截断到 8000 字符 |
| `enabledSkills` | 启用的 Skill 列表 | 拼接每个 Skill 的内容 |
| `currentSnapshotSummary` | 当前 UI 快照 | 提取 surfaceId、组件 ID 列表作为文本摘要 |
| `catalogSummary` | catalogId | 提示当前使用的 Catalog 标识 |

### 数据处理策略

- **最近消息**：取最近 20 条，角色名翻译为中文，单条消息 >2000 字符截断
- **上传文件**：每个文件单独截断到 8000 字符，标记文件名和序号
- **UI 快照**：遍历 `snapshot.surfaces`，列出每个 surface 的 catalogId 和组件 ID 列表

---

## 二、Prompt 拼装（PromptComposer + A2UI 协议指南）

**文件：** [prompt-composer.ts](../packages/agent/src/prompts/prompt-composer.ts)、[a2ui-protocol-guide.ts](../packages/agent/src/prompts/a2ui-protocol-guide.ts)

### 2.1 System Prompt（系统提示）

由 `PromptComposer.buildBaseSystemPrompt()` 组装，分为三个部分：

#### ① 角色定义

> "你是一个 A2UI 页面生成助手。你的任务是根据用户的自然语言描述，使用固定的 Basic Catalog 组件生成符合 A2UI v0.9 规范的 UI 界面。"

#### ② A2UI 协议指南（核心）

由 `buildA2uiProtocolGuide(componentList)` 生成，约 105 行，是 System Prompt 的核心内容：

| 章节 | 内容 |
| --- | --- |
| **1. 输出外层结构** | 必须是纯 JSON `{ assistantMessage, a2uiMessages }`，不能用 Markdown 代码块包裹。纯聊天时 `a2uiMessages` 为空数组 `[]` |
| **2. 可用组件** | 动态注入 18 个组件名称（从 `catalog-schema.ts` 获取），禁止使用 Catalog 外组件或 HTML/JS/CSS |
| **3. 消息类型** | 4 种 A2UI v0.9 消息：`createSurface`、`updateDataModel`、`updateComponents`、`deleteSurface`，给出每种消息的 JSON 格式模板。生成顺序：先 createSurface → updateDataModel（如需要）→ updateComponents |
| **4. 组件树规则** | 邻接表设计（非嵌套 children 对象）、`root` 节点必须存在、id 唯一、child/children 引用必须是真实 id |
| **5. 常用组件字段** | 18 个组件逐个列出关键属性和枚举值，如 `Text: { text, usageHint, variant, tone, ... }` |
| **5.1 受控样式字段** | 25 个白名单 CSS 属性：width、height、padding、margin、gap、color、backgroundColor、borderRadius、fontSize、fontWeight、textAlign、shadow、opacity 等。颜色推荐 `rgb()` / `#RRGGBB`，长度推荐 `px` / `%` / `rem` |
| **6. 页面组织方法** | 推荐 root 使用 Column；标题用 usageHint="h1"；分区用 Card 包裹；Tabs 必须用 `tabItems` 字段；信息密集页面用 Row/Column 表达层级 |
| **7. 数据绑定** | 动态数据用 JSON Pointer `{ "path": "/some/data/path" }`；固定文案直接写字符串 |
| **8. 常见错误与禁止写法** | 列出 6 种典型错误：用 `tabs` 而非 `tabItems`、children 内写完整组件对象、action 写成字符串、生成 table/div 等非法组件、使用 className/css/html 等非法字段、style 中写非白名单属性 |
| **9. 标准页面示例** | 一个完整的课表页面 JSON 示例，展示正确的消息顺序、root、容器层级、Tabs.tabItems、Card 标题和受控样式 |

#### ③ 禁止事项与注意事项

```
## 禁止事项
- 禁止生成任意 HTML、JavaScript 或 CSS
- 禁止用 Markdown 代码块（如 ```json）包裹 JSON 输出
- 禁止使用 Catalog 之外的自定义组件
- 禁止在组件属性中使用 "innerHTML"、"eval"、"<script" 等不安全内容
- 禁止引用不存在的组件 id

## 注意事项
- 必须确保所有组件 id 在同一个 surface 内唯一
- updateComponents 中的 components 数组不能为空
- 如果用户只是纯文字对话（不涉及 UI 修改），assistantMessage 给出回复，a2uiMessages 设为空数组 []
```

### 2.2 User Prompt（用户提示）

由 `buildUserPrompt()` 将上下文字段逐一拼接成带标题的文本块：

```
## 用户需求
<用户原始消息>

## 最近消息历史
<最近 20 条对话记录>

## 上传文件内容
<文件内容>

## 启用的 Skills
<Skill 内容>

## 当前 UI 状态摘要
<当前 surface 和组件信息>

## 可用 Catalog
当前使用的 Catalog: <catalogId>

请根据以上用户需求和上下文信息，生成符合 A2UI v0.9 规范的 UI 界面。
如果用户没有要求修改 UI，则只需回复文本，a2uiMessages 设为空数组。
```

### 2.3 修复模式 Prompt

当校验失败时，`composeRepair()` 方法生成专门的修复提示：

- **System Prompt**：在基础 System Prompt 末尾追加 **"你现在处于修复模式。请只修复下面列出的校验错误，不要重新设计整个 UI。保持已有的正确部分不变。"**
- **User Prompt**：包含三个部分：
  1. 上一版模型输出（原始 JSON）
  2. 校验失败详情（格式：`[序号] 错误码: XXX，路径: /path，信息: message`）
  3. 用户原始需求（供参考）

---

## 三、模型调用（ModelClient）

**文件：** [model-client.ts](../packages/agent/src/model/model-client.ts)

通过 OpenAI-compatible API 的 `/chat/completions` 端点发送请求：

### 请求参数

| 参数 | 来源 | 说明 |
| --- | --- | --- |
| `model` | config | 模型名称 |
| `messages` | 组装结果 | `[{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]` |
| `temperature` | config | 温度参数（0-2） |
| `max_tokens` | config | 最大生成 token 数 |
| `timeout` | config（默认 60s） | 通过 AbortController 实现超时控制 |

### 错误处理

- HTTP 非 200 → 抛出 `模型 API 调用失败：HTTP xxx: body`
- 响应格式不符 → 抛出 `模型 API 返回格式不符合预期`
- 超时 → 抛出 `模型 API 调用超时（xxxms）`
- 网络异常 → 抛出 `模型 API 调用异常：message`

错误在 AgentRuntime 层被捕获，如果不是最后一次尝试则进入重试循环。

---

## 四、输出解析（parseModelOutput）

**文件：** [output-parser.ts](../packages/agent/src/runtime/output-parser.ts)

对模型原始输出做多层解析，返回 `ParseResult`：

### 解析流程

```
模型原始文本
    │
    ▼
1. 去除 Markdown 代码块
   - 匹配 /^```(?:json)?\s*\n...\n\s*```\s*$/ 格式
   - 处理不规则的 ``` 包裹
    │
    ▼
2. JSON 解析
   - 先尝试直接 JSON.parse()
   - 失败后查找第一个 { 到最后一个 } 再解析
   - 仍失败则返回错误
    │
    ▼
3. 结构校验
   - 顶层必须是对象（不能是数组）
   - assistantMessage 必须是 string 类型
   - a2uiMessages 必须是 Array 类型
   - 每条 a2uiMessage.version 必须为 "v0.9"
    │
    ▼
返回 { ok: true, data: { assistantMessage, a2uiMessages } }
或 { ok: false, error: "..." }
```

---

## 五、校验（validateA2UI）

**文件：** [validate-a2ui.ts](../packages/agent/src/tools/validate-a2ui.ts)

使用 **Ajv** 加载两份 JSON Schema，执行 6 步校验：

| 步骤 | 检查内容 | 错误码 | 实现方式 |
| --- | --- | --- | --- |
| 1. A2UI 结构 | 每条消息是否符合 A2UI v0.9 消息格式 | `A2UI_STRUCTURE` | `a2ui-v0.9-schema.json` → Ajv compile |
| 2. 组件属性 | 每个组件的属性类型、枚举值、必填字段 | `CATALOG_PROPERTY` / `UNKNOWN_COMPONENT` | `basic-catalog-schema.json` → Ajv `$ref` 引用对应组件的 definition |
| 3. Root 存在 | 有 `updateComponents` 时必须存在 `id="root"` | `MISSING_ROOT` | 遍历收集所有组件 id，检查是否包含 "root" |
| 4. Child 引用 | `child`/`children`/`tabItems[].child` 引用的 id 必须真实存在 | `MISSING_CHILD_REF` | 按 surfaceId 分组收集组件 id，再遍历检查引用 |
| 5. Surface 存在 | `updateDataModel`/`updateComponents`/`deleteSurface` 的目标 surface 必须已创建 | `UNKNOWN_SURFACE` | 从 `createSurface` 消息和 `currentSnapshot` 收集已知 surface |
| 6. 安全约束 | 拒绝含 `<script>`、`innerHTML`、`eval(...)`、`javascript:`、`on*=*` 的消息 | `UNSAFE_CONTENT` | 将消息 JSON.stringify 后用正则匹配 |

### 校验器初始化策略

- **懒初始化**：Ajv 实例、A2UI Schema Validator、Catalog Schema Validator 均在首次调用时创建
- **Schema 注册**：Catalog Schema 以 `"basic-catalog"` 为 key 注册到 Ajv，校验时通过 `{ $ref: "basic-catalog#/definitions/<ComponentName>" }` 动态引用对应组件的属性约束
- **非严格模式**：`strict: false` + `validateSchema: false`，允许 JSON Schema 中的非标准关键字

---

## 六、重试循环（AgentRuntime.run）

**文件：** [agent-runtime.ts](../packages/agent/src/runtime/agent-runtime.ts)

### 流程图

```
用户输入 (AgentRunInput)
    │
    ▼
┌─────────────────────────────────────────────┐
│  阶段 PREPARE_CONTEXT                        │
│  AgentContextBuilder.buildContext(input)     │
│  → AgentContext                              │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  阶段 GENERATE_DRAFT / REPAIR_DRAFT          │
│  PromptComposer.composeInitial(context)      │
│  或 PromptComposer.composeRepair(...)        │
│  → { systemPrompt, userPrompt }              │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  ModelClient.generate(messages)              │
│  → 模型原始文本                               │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  parseModelOutput(content)                   │
│  → { assistantMessage, a2uiMessages }        │
│  或 { error }                                │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│  阶段 VALIDATE_DRAFT                         │
│  validateA2UI({ messages, catalogId, ... })  │
│  → ValidateA2UIResult                        │
└─────────────────────────────────────────────┘
    │
    ├── ✅ 校验通过 + 有 A2UI → COMMITTED
    ├── ✅ 校验通过 + 无 A2UI → TEXT_ONLY
    │
    └── ❌ 校验失败
        │
        ├── attempt < 3 → composeRepair() → 重新调用模型
        └── attempt = 3 → FAILED
```

### 三种终止状态

| 状态 | 含义 | 触发条件 |
| --- | --- | --- |
| `COMMITTED` | 成功生成并校验通过 | A2UI 消息通过全部 6 步校验，且消息数组非空 |
| `TEXT_ONLY` | 纯文本回复 | 校验通过但 `a2uiMessages` 为空数组（用户只是聊天） |
| `FAILED` | 生成失败 | 3 次尝试后仍解析失败、校验失败或模型调用失败 |

### 修复模式的关键设计

修复时 **不重新构建上下文**，而是复用初始的 `AgentContext`，System Prompt 追加修复指令，User Prompt 替换为上一版输出 + 具体错误列表。这样设计确保了：

1. **精准修复**：模型看到具体的错误码和路径，知道哪里出错
2. **保持已有成果**："不要重新设计整个 UI"的指令防止模型在修复时大改结构
3. **上下文一致性**：原始需求始终保留在修复 Prompt 中供参考

---

## 七、关键设计决策

### 7.1 为什么用 "指导式 Prompt" 而非 "结构化输出（Function Calling / JSON Mode）"

当前方案使用大段自然语言 System Prompt 描述 A2UI 协议和组件约束，引导模型输出纯 JSON，原因可能是：

- 输出结构复杂（包含嵌套的 A2UI 消息数组、组件邻接表），单一的 JSON Schema 可能难以完全约束
- 协议指南中包含了大量"最佳实践"（如推荐 root 用 Column、页面组织方法），这些不适合用 Schema 表达
- 灵活性更高，可以随时调整指令而不改 Schema

### 7.2 为什么组件定义同时存在 JSON Schema 和 TypeScript 硬编码

项目中组件定义有两份：

- **JSON Schema**（`basic-catalog-schema.json`）：用于运行时 **Ajv 校验**，严格约束 LLM 输出
- **TypeScript 硬编码**（`catalog-schema.ts`）：用于 **生成 Prompt 中的组件速查表**（`getAllCatalogComponentNames()`），以及提供编程接口

### 7.3 为什么采用邻接表而非嵌套组件树

A2UI v0.9 使用 **邻接表**（flat list + id references）而非嵌套 JSON 对象来表达组件树。这降低了模型生成深度嵌套 JSON 时出错的可能性，也使增量更新（只修改部分组件）成为可能。

### 7.4 安全设计的双层防护

| 层级 | 机制 | 说明 |
| --- | --- | --- |
| Prompt 层 | 禁止事项列表 | 阻止 LLM 生成 unsafe 内容 |
| 校验层 | `UNSAFE_CONTENT` 检查 | 即使 Prompt 失效，正则匹配仍能拦截 |
| Schema 层 | `additionalProperties: false` | 阻止 LLM 编造不存在的字段 |

---

## 八、数据流全景

```
                    ┌──────────────────────┐
                    │   用户输入            │
                    │   - 自然语言消息       │
                    │   - 上传 .txt 文件     │
                    │   - Skills            │
                    │   - 历史消息           │
                    │   - 当前 UI 快照       │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  AgentContextBuilder  │
                    │  格式化为 AgentContext │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   PromptComposer      │
                    │  ┌─────────────────┐  │
                    │  │ System Prompt    │  │
                    │  │  - 角色定义       │  │
                    │  │  - A2UI 协议指南  │  │
                    │  │  - 禁止/注意事项  │  │
                    │  ├─────────────────┤  │
                    │  │ User Prompt      │  │
                    │  │  - 用户需求       │  │
                    │  │  - 上下文信息     │  │
                    │  └─────────────────┘  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   ModelClient         │
                    │   OpenAI-compatible   │
                    │   /chat/completions   │
                    └──────────┬───────────┘
                               │ 原始文本
                    ┌──────────▼───────────┐
                    │   parseModelOutput    │
                    │   去代码块 → JSON解析  │
                    │   → 结构校验          │
                    └──────────┬───────────┘
                               │ { assistantMessage, a2uiMessages }
                    ┌──────────▼───────────┐
                    │   validateA2UI        │
                    │   ┌────────────────┐  │
                    │   │ 1. A2UI 结构    │  │
                    │   │ 2. 组件属性     │  │
                    │   │ 3. Root 存在    │  │
                    │   │ 4. Child 引用   │  │
                    │   │ 5. Surface 存在 │  │
                    │   │ 6. 安全约束     │  │
                    │   └────────────────┘  │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ✅ 通过且有UI   ✅ 通过无UI    ❌ 失败(<3次)
                │              │              │
         COMMITTED      TEXT_ONLY      composeRepair()
                                          │
                                    重新调用模型
                                          │
                                    ❌ 失败(=3次)
                                          │
                                       FAILED
```

---

## 九、组件信息渐进式披露机制

当前 Agent 不再在初始 System Prompt 中一次性注入所有 Basic Catalog 组件的完整字段说明。初始上下文只暴露：

- A2UI v0.9 输出 envelope。
- createSurface、updateDataModel、updateComponents、deleteSurface 消息顺序。
- 邻接表组件树规则、root 规则、child/children 引用规则。
- 数据绑定规则和安全禁止项。
- Basic Catalog 组件名称与一句话功能摘要。

当 LLM 需要某些组件的字段、必填项或枚举值时，应先输出结构化请求：

```json
{
  "assistantMessage": "需要查看组件详情后再生成。",
  "componentInfoRequest": {
    "components": ["Column", "Text", "Card"],
    "reason": "需要布局、文本和卡片容器字段"
  }
}
```

Agent Runtime 会解析 `componentInfoRequest.components`，过滤未知组件和已披露组件，通过 `getComponentDef(name)` 获取组件定义，并把对应组件详情注入下一轮 Prompt。组件详情披露最多 3 轮；超过上限后，Runtime 会强制提示 LLM 基于已披露信息输出最终 `{ assistantMessage, a2uiMessages }` JSON。

最终输出契约不变：

```json
{
  "assistantMessage": "说明生成或修改了什么",
  "a2uiMessages": []
}
```

`validateA2UI` 仍是最终提交前的强制校验。渐进式披露只改变上下文组织方式，不放宽 A2UI/Catalog 校验。
