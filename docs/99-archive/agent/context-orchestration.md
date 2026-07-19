# Agent 上下文编排与组成

> 基于 `packages/agent/src/` 源码分析（截至 2026-07-12）

## 1. 概述

Agent 模块的核心任务是将用户的自然语言 UI 需求转换为合法的 A2UI v0.9 消息。这一过程并非简单的一次性 Prompt → 模型输出 → 校验，而是一个**多层次的上下文编排系统**，涉及上下文构建、渐进式信息披露、Prompt 动态组装、模型调用、输出解析和校验修复循环。

整个编排架构可以用"**上下文分层注入 + 渐进式按需披露 + 生成-校验-修复循环**"来概括。

## 2. 上下文编排总览

```text
┌─────────────────────────────────────────────────────────────────┐
│                     AgentRunInput (后端传入)                      │
│  userMessage | recentMessages | uploadedFiles | enabledSkills    │
│  currentSnapshot | catalogId | model config                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AgentContextBuilder.buildContext()               │
│                                                                   │
│  将各维度输入格式化为统一 AgentContext：                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ 用户消息      │ │ 最近消息历史  │ │ 上传文件内容  │              │
│  │ (原文)       │ │ (最近20条,    │ │ (每文件8K截断)│              │
│  │              │ │  2K截断/条)   │ │              │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ Skill 摘要    │ │ UI 快照摘要   │ │ Catalog 摘要  │              │
│  │ (id+name+desc│ │ (Surface列表, │ │ (catalogId)  │              │
│  │  不含完整内容) │ │  组件清单)     │ │              │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
│  ┌──────────────┐                                                 │
│  │ Skill 原始列表│ ← 保留引用，供 Runtime 按需披露                  │
│  └──────────────┘                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ AgentContext
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PromptComposer                                 │
│                                                                   │
│  composeInitial() / composeRepair()                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     System Prompt                           │ │
│  │  ┌───────────┐ ┌──────────────────────────────────────┐    │ │
│  │  │ 角色定义   │ │  A2UI 协议指南 (动态)                  │    │ │
│  │  │           │ │  · 输出结构 · 请求格式 · 消息类型     │    │ │
│  │  │ 禁止事项   │ │  · 组件摘要 · 组件树规则 · 数据绑定  │    │ │
│  │  │           │ │  · 已披露组件详情 (条件注入)           │    │ │
│  │  │ 注意事项   │ │  · 已披露 Skill 内容 (条件注入)       │    │ │
│  │  └───────────┘ │  · 强制最终输出 (条件注入)             │    │ │
│  │                 └──────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     User Prompt                             │ │
│  │  · 用户需求 · 历史消息 · 上传文件 · Skill 摘要              │ │
│  │  · UI 快照摘要 · Catalog 摘要 · 渐进式披露指引              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ { systemPrompt, userPrompt }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ModelClient                                 │
│  OpenAI-compatible API 调用 (fetch + AbortController 超时控制)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ ModelResponse { content, usage }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Runtime 渐进式披露循环 (最多3轮)                       │
│                                                                   │
│  ┌──────────┐    有请求    ┌───────────────────┐                 │
│  │ 解析输出  │ ──────────▶ │ 披露 Skill 内容     │ ──▶ 下一轮     │
│  │          │             │ 披露 Component 详情 │                 │
│  │          │    无请求    └───────────────────┘                 │
│  │          │ ──────────▶ 进入校验流程                            │
│  └──────────┘                                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 最终输出 JSON
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         parseModelOutput() → validateA2UI() → 结果判定            │
│                                                                   │
│  通过 → COMMITTED / TEXT_ONLY                                     │
│  失败 → repair prompt → 重试 (最多3次) → FAILED                   │
└─────────────────────────────────────────────────────────────────┘
```

## 3. 上下文六维度详解

### 3.1 用户消息（userMessage）

- **来源**：`AgentRunInput.userMessage`
- **处理**：原文透传，不做截断或转换
- **注入位置**：User Prompt 的 `## 用户需求` 区块
- **特殊角色**：在修复模式下作为参考信息保留在 `## 用户原始需求（参考）` 中

### 3.2 最近消息历史（recentMessages）

- **来源**：`AgentRunInput.recentMessages`
- **处理规则**：
  - 取最近 **20 条**消息（`MAX_RECENT_MESSAGES = 20`）
  - 单条消息超过 **2000 字符**时截断并标注"（已截断）"
  - 角色标签翻译为中文：`user` → `用户`、`assistant` → `助手`、`system` → `系统`、`tool` → `工具`
  - 序号从 1 开始递增
- **注入位置**：User Prompt 的 `## 最近消息历史` 区块
- **空值兜底**：`"（无历史消息）"`

### 3.3 上传文件内容（uploadedFiles）

- **来源**：`AgentRunInput.uploadedFiles`
- **处理规则**：
  - 每个文件内容截断至 **8000 字符**（`MAX_FILE_CONTENT_LENGTH = 8000`）
  - 格式：`### 文件 {序号}：{原始文件名}` + 内容 + 空行
  - 超过截断阈值时标注"（文件过长，已截断）"
- **注入位置**：User Prompt 的 `## 上传文件内容` 区块
- **空值兜底**：`"（无上传文件）"`
- **设计意图**：支持用户上传 `.txt` 需求文件，Agent 理解文件内容后生成对应 UI

### 3.4 启用 Skills（enabledSkills）

- **来源**：`AgentRunInput.enabledSkills`
- **两层设计**——这是上下文编排中最重要的"按需披露"模式：

| 层级 | 字段 | 内容 | 注入时机 |
|------|------|------|----------|
| 摘要层 | `enabledSkills`（文本） | 仅 `id`、`name`、`description` | **首轮** User Prompt |
| 完整层 | `enabledSkillList`（原始数组） | 完整 `content` | **按需**→ System Prompt 条件注入 |

- **摘要格式**：
  ```
  ## 启用的 Skills 摘要
  - id: skill-1
    name: 课程表规范
    description: 生成课程表时使用
  ```
- **完整内容披露**：见第 5.2 节
- **空值兜底**：`"（无启用的 Skills）"`

### 3.5 当前 UI 快照（currentSnapshotSummary）

- **来源**：`AgentRunInput.currentSnapshot`
- **处理规则**：
  - 遍历 `snapshot.surfaces` 中每个 Surface
  - 输出格式：`Surface: "{surfaceId}"，catalog: {catalogId}` + 组件数量和 ID 列表
- **注入位置**：User Prompt 的 `## 当前 UI 状态摘要` 区块
- **空值兜底**：`"（当前无 UI 状态）"`
- **设计意图**：让 Agent 感知当前页面已有组件，支持增量修改（而非每次重新生成整页）

### 3.6 Catalog 摘要（catalogSummary）

- **来源**：`AgentRunInput.catalogId`
- **处理**：仅输出 `当前使用的 Catalog: {catalogId}`
- **注入位置**：User Prompt 末尾
- **注意**：这只是元信息标识。组件名称和用途摘要由 `formatCatalogComponentSummaries()` 生成，注入到 **System Prompt** 的"可用组件摘要"区块（见第 4.1 节 Section 4），两者分工不同。

## 4. Prompt 分层组装

### 4.1 System Prompt 结构

System Prompt 是**动态模板**，由 `PromptComposer.buildBaseSystemPrompt()` 和 `buildA2uiProtocolGuide()` 共同组装，包含以下固定区块和条件区块：

```text
┌────────────────────────────────────────────┐
│ 1. 角色定义                                 │  固定
│    "你是一个 A2UI 页面生成助手..."           │
├────────────────────────────────────────────┤
│ 2. A2UI v0.9 协议生成指南 (动态)             │  动态
│    ┌──────────────────────────────────────┐ │
│    │ Section 1: 最终输出结构               │ │  固定
│    │ Section 2: 组件详情请求格式            │ │  固定
│    │ Section 3: Skill 内容请求格式          │ │  固定
│    │ Section 4: 可用组件摘要 (名称+描述)     │ │  固定(每轮注入)
│    │ Section 5: 消息类型 (4种)             │ │  固定
│    │ Section 6: 组件树规则                  │ │  固定
│    │ Section 7: 数据绑定                    │ │  固定
│    │ Section 8: 页面组织方法                │ │  固定
│    │ Section 9: 常见错误与禁止写法           │ │  固定
│    │ Section 10: 已披露 Skill 内容          │ │  条件注入
│    │ Section 11: 已披露组件详情              │ │  条件注入
│    │ Section 12: 强制最终输出                │ │  条件注入
│    └──────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ 3. 禁止事项                                  │  固定
│    禁止 HTML/JS/CSS、Markdown代码块、        │
│    自定义组件、不安全内容、不存在的组件ID      │
├────────────────────────────────────────────┤
│ 4. 注意事项                                  │  固定
│    ID唯一性、components数组非空、             │
│    纯对话时a2uiMessages为空数组               │
└────────────────────────────────────────────┘
```

### 4.2 User Prompt 结构

User Prompt 将 `AgentContext` 的六个维度**按固定顺序拼接**：

```text
## 用户需求
{userMessage}

## 最近消息历史
{recentMessages}

## 上传文件内容
{uploadedFiles}

## 启用的 Skills 摘要
{enabledSkills}           ← 仅摘要！不含完整内容

## 当前 UI 状态摘要
{currentSnapshotSummary}

## Catalog 摘要
{catalogSummary}

请根据以上用户需求和上下文信息生成 A2UI。
若需要 Skill 完整内容，请先输出 skillInfoRequest；
若需要组件字段详情，请先输出 componentInfoRequest；
若已有足够信息，请输出最终 { assistantMessage, a2uiMessages } JSON。
```

### 4.3 修复模式 Prompt

当校验失败且未达到最大尝试次数时，进入修复模式：

- **System Prompt**：基础 System Prompt + 修复指令（"只修复校验错误，不要重新设计整个 UI"）+ `forceFinalOutput: true`
- **User Prompt**：
  ```text
  ## 上一版模型输出
  {上次输出的 JSON}
  
  ## 校验失败详情
  以上输出经过 A2UI v0.9 校验后未通过。请修复以下错误：
  [1] 错误码 {code}，路径 {path}，信息 {message}
  ...
  
  ## 用户原始需求（参考）
  {原始 userMessage}
  
  请只修复上述列出的错误。正确部分保持不变，不要重新设计整个 UI。
  只输出修复后的完整 JSON。
  ```

## 5. 渐进式信息披露机制

这是 Agent 上下文编排中**最核心的设计模式**——首轮不注入所有信息，而是让模型按需"请求"详情，由 Runtime 在后续轮次中"披露"。

### 5.1 设计动机

| 问题 | 解决方案 |
|------|----------|
| 一次性注入全部 19 个组件的完整字段定义会使 Prompt 过长 | 首轮只注入组件名称 + 一句话用途摘要 |
| 一次性注入全部 Skill 完整内容会使 Prompt 过长且可能无关 | 首轮只注入 Skill 的 id/name/description |
| 模型可能"臆造"不存在或错误的组件字段 | 引导模型在不确定时主动请求详情 |
| 需要在有限轮次内收敛 | 最多 3 轮披露 + 1 轮强制输出 |

### 5.2 两种披露通道

#### 通道 A：组件详情披露

```text
┌─ 首轮 Prompt ───────────────────────────────────────┐
│ System: Section 4 可用组件摘要                        │
│   - Text: 文本显示组件，支持标题和正文样式              │
│   - Button: 按钮组件，携带交互动作                     │
│   - Column: 垂直布局容器                              │
│   ...（仅名称+一句话用途，无字段定义）                  │
│                                                       │
│ Section 2: 如需组件字段详情，输出 componentInfoRequest  │
└──────────────────────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │ 模型不确定字段，发出请求    │
          ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ {                       │  │ Runtime 处理：            │
│   "assistantMessage":   │  │ 1. parseComponentInfo   │
│     "需要查看组件详情",   │  │    Request() 解析请求     │
│   "componentInfoRequest":│  │ 2. 查 disclosedComponents│
│     {                   │  │    去重                   │
│       "components":     │  │ 3. formatCatalogComponent│
│         ["Column","Text",│  │    Details() 格式化详情   │
│          "Card"],       │  │ 4. 注入下一轮 System      │
│       "reason": "需要.." │  │    Prompt Section 11     │
│     }                   │  │ 5. 记录 ToolCallRecord   │
│ }                       │  └─────────────────────────┘
└─────────────────────────┘
                        │
                        ▼
┌─ 下一轮 Prompt ─────────────────────────────────────┐
│ System: Section 11 已披露组件详情                      │
│   ### Column                                         │
│   用途：垂直布局容器                                   │
│   字段：                                              │
│   - id: string，必填                                  │
│   - component: string，必填                           │
│   - children: string[]，必填，说明：子组件 ID 列表      │
│   - distribution: string，可选，可选值：start | ...    │
│   ...                                                │
│   ### Text                                           │
│   用途：文本显示组件...                                 │
│   字段：                                              │
│   - text: string，必填，说明：显示的文本内容             │
│   ...                                                │
│   ### Card                                           │
│   ...                                                │
└──────────────────────────────────────────────────────┘
```

**去重与边界处理**：
- 已披露的组件记录在 `disclosedComponents: Set<string>` 中，不会重复注入
- 不在 Basic Catalog 中的组件名称 → 反馈"以下组件不在 Basic Catalog 中，不能使用"
- 已披露过的组件 → 反馈"以下组件详情已经提供过，不会重复注入"

#### 通道 B：Skill 内容披露

```text
┌─ 首轮 Prompt ───────────────────────────────────────┐
│ User: ## 启用的 Skills 摘要                           │
│   - id: skill-1                                      │
│     name: 课程表规范                                  │
│     description: 生成课程表时使用                      │
│   （仅摘要！不含完整 content）                          │
│                                                       │
│ System: Section 3: 如需 Skill 完整内容，输出            │
│         skillInfoRequest                              │
└──────────────────────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │ 模型需要完整规则，发出请求   │
          ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ {                       │  │ Runtime 处理：            │
│   "assistantMessage":   │  │ 1. parseSkillInfoRequest │
│     "需要查看Skill详情",  │  │    () 解析请求            │
│   "skillInfoRequest":   │  │ 2. 按 id 优先、name 其次  │
│     {                   │  │    从 enabledSkillList   │
│       "skills":         │  │    中精确匹配             │
│         ["skill-1"],    │  │ 3. 注入下一轮 System      │
│       "reason": "需要.." │  │    Prompt Section 10     │
│     }                   │  │ 4. 记录 ToolCallRecord   │
│ }                       │  └─────────────────────────┘
└─────────────────────────┘
                        │
                        ▼
┌─ 下一轮 Prompt ─────────────────────────────────────┐
│ System: Section 10 已披露 Skill 内容                   │
│   ### Skill: 课程表规范                                │
│   id: skill-1                                         │
│                                                       │
│   必须使用三栏布局，这是完整 Skill 内容。                 │
│   （完整的 Markdown 规范内容）                           │
└──────────────────────────────────────────────────────┘
```

**匹配策略**：
- 优先按 `id` 精确匹配
- 如果 `id` 未命中，再尝试按 `name` 匹配
- 不在 `enabledSkillList` 中的 Skill → 反馈"以下 Skill 未启用或不存在"
- 已披露过的 Skill → 反馈"以下 Skill 内容已经提供过"

### 5.3 披露循环控制

核心实现在 `AgentRuntime.generateWithProgressiveDisclosure()`：

```text
常量:
  MAX_DISCLOSURE_ROUNDS = 3  ← 最多3轮自愿披露

伪代码:
  for round in 1..4:            // 第4轮强制输出
    forceFinalOutput = round > 3
    
    composeInitial(context, {
      componentDetails,        ← 累加的组件详情
      skillDetails,            ← 累加的 Skill 内容
      forceFinalOutput         ← 第4轮为 true
    })
    
    response = modelClient.generate(systemPrompt, userPrompt)
    
    if forceFinalOutput: break  ← 强制最终输出，不再检查请求
    
    // 检查模型是否发出了信息请求
    skillReq = parseSkillInfoRequest(response.content)
    compReq = parseComponentInfoRequest(response.content)
    
    if 两者都无请求: break       ← 模型认为信息足够，退出循环
    
    // 处理请求并披露
    if skillReq.ok: discloseSkills(...)
    if compReq.ok: discloseComponents(...)
    
    // 继续下一轮（累加的 componentDetails/skillDetails 会注入 Prompt）
```

**关键设计点**：
- 披露循环只在**初始模式**（`attempt === 1`）下运行，修复模式不进入披露循环
- 两种披露**共用轮次**：如果模型同时请求 Skill 和组件详情，它们会在同一轮中被处理
- 第 4 轮强制最终输出：System Prompt 注入 Section 12 强制指令，明确禁止继续请求详情
- 如果某轮模型同时发出 skillInfoRequest 和 componentInfoRequest，两者都会被处理后才进入下一轮

## 6. 主循环编排

`AgentRuntime.run()` 是整个编排的顶层调度器：

```text
run(input, onToolCall):
  │
  ├─ 1. 构建 AgentContext (一次性)
  │     context = contextBuilder.buildContext(input)
  │
  ├─ 2. 主循环 (最多 MAX_ATTEMPTS = 3 次)
  │     for attempt in 1..3:
  │       │
  │       ├─ 2a. 模型调用
  │       │     if attempt > 1 (修复模式):
  │       │       composeRepair(上次输出, 校验错误) → generate()
  │       │     else (初始模式):
  │       │       generateWithProgressiveDisclosure() ← 内含披露循环
  │       │
  │       ├─ 2b. 输出解析
  │       │     parseModelOutput(response.content)
  │       │     → { assistantMessage, a2uiMessages }
  │       │     解析失败 → 继续下一轮/FAILED
  │       │
  │       ├─ 2c. 校验判定
  │       │     if a2uiMessages.length === 0 → TEXT_ONLY (成功)
  │       │     if validateA2UI() 通过     → COMMITTED (成功)
  │       │     if 校验失败 && attempt < 3  → 进入修复模式
  │       │     if 校验失败 && attempt >= 3 → FAILED
  │       │
  │       └─ 2d. 记录
  │             记录 validateA2UI 工具调用 → onToolCall()
  │             累加 Token 用量
  │
  └─ 3. 返回 AgentRunResult
```

### 6.1 三种结果状态

| 状态 | 条件 | 含义 |
|------|------|------|
| `COMMITTED` | `a2uiMessages.length > 0` 且通过校验 | UI 生成成功，消息可提交 |
| `TEXT_ONLY` | `a2uiMessages.length === 0` 且解析/校验通过 | 纯对话响应，无 UI 变更 |
| `FAILED` | 3 次尝试后仍未通过解析或校验 | 生成失败，携带失败原因 |

### 6.2 修复模式 vs 初始模式

| 维度 | 初始模式 (attempt=1) | 修复模式 (attempt>1) |
|------|---------------------|---------------------|
| Prompt 组成 | `composeInitial()` | `composeRepair()` |
| 渐进式披露 | ✅ 最多 3 轮 | ❌ 不进入披露循环 |
| 上下文 | 完整 AgentContext | 上次输出 + 错误列表 + 原始需求 |
| 组件详情 | 按需披露后累加注入 | 复用初始模式累加的结果 |
| 预期输出 | 新生成 UI | 修复具体校验错误 |

## 7. Catalog 组件定义体系

`catalog-schema.ts` 硬编码了 A2UI v0.9 Basic Catalog 的全部 19 个组件定义，是上下文编排中"组件知识"的唯一来源。

### 7.1 组件清单

| 类别 | 组件 | 核心必填字段 |
|------|------|-------------|
| 展示 | Text | `text` |
| 展示 | Image | `url` |
| 展示 | Icon | `name` |
| 展示 | Video | `url` |
| 展示 | AudioPlayer | `url` |
| 展示 | Divider | （无必填） |
| 布局 | Row | `children` (string[]) |
| 布局 | Column | `children` (string[]) |
| 布局 | List | `children` (array) |
| 容器 | Card | `child` (string) |
| 容器 | Tabs | `tabItems` (array) |
| 容器 | Modal | `child` (string) |
| 交互 | Button | `child`, `action` (object) |
| 表单 | TextField | `label`, `text` |
| 表单 | CheckBox | `label`, `value` |
| 表单 | ChoicePicker | `label`, `options`, `value` |
| 表单 | Slider | `label`, `min`, `max`, `value` |
| 表单 | DateTimeInput | `label`, `value` |

### 7.2 共享属性

- **视觉属性（VISUAL_PROPERTIES）**：`style`（受控白名单样式对象）、`variant`（13 值）、`size`（sm/md/lg）、`tone`（5 值）、`preset`（17 值）
- **表单属性（FORM_PROPERTIES）**：`placeholder`、`disabled`、`required`、`helpText`、`errorText`

### 7.3 查询 API 与用途

| API | 返回内容 | 使用场景 |
|-----|----------|----------|
| `getCatalogComponentSummaries()` | 名称 + 描述（无字段） | 首轮 Prompt Section 4 |
| `formatCatalogComponentSummaries()` | 上述内容的格式化文本 | 同上 |
| `getComponentDef(name)` | 单个组件完整定义 | 渐进式披露时按需查询 |
| `formatCatalogComponentDetails(names)` | 多个组件字段详情格式化文本 | 渐进式披露后注入 Prompt |
| `getCatalogComponents()` | 全部组件完整定义 | 校验时使用 |
| `getBasicCatalogDefinition()` | 含 catalogId 的完整定义 | 外部引用 |

## 8. 模型输出解析与校验

### 8.1 输出解析（output-parser.ts）

`parseModelOutput()` 执行三级解析：

1. **Markdown 清洗**：去除 ` ```json ``` ` 代码块包裹，支持不完整包裹格式
2. **JSON 解析**：尝试直接解析，失败后通过 `{` / `}` 定位提取 JSON 子串再解析
3. **字段验证**：
   - 顶层必须是对象（非数组）
   - `assistantMessage` 必须是非空字符串
   - `a2uiMessages` 必须是数组
   - 数组中每条消息的 `version` 必须为 `"v0.9"`

### 8.2 信息请求解析

两个专用解析器用于识别渐进式披露请求：

- **`parseComponentInfoRequest(raw)`**：提取 `componentInfoRequest.components[]`（非空字符串数组）+ 可选 `reason`
- **`parseSkillInfoRequest(raw)`**：提取 `skillInfoRequest.skills[]`（非空字符串数组）+ 可选 `reason`

### 8.3 A2UI 校验（validate-a2ui.ts）

`validateA2UI()` 执行**六项校验**（基于 Ajv JSON Schema）：

| 序号 | 校验项 | 错误码 | 说明 |
|------|--------|--------|------|
| 1 | 消息结构 | `A2UI_STRUCTURE` | 每条消息是否符合 A2UI v0.9 JSON Schema |
| 2 | 组件属性 | `CATALOG_PROPERTY` | `updateComponents` 中每个组件属性是否符合 Catalog 定义 |
| 3 | 根组件 | `MISSING_ROOT` | 有任何组件创建时必须存在 `id="root"` |
| 4 | 子组件引用 | `MISSING_CHILD_REF` | `child`/`children`/`tabItems.child` 引用的 ID 必须存在 |
| 5 | Surface 引用 | `UNKNOWN_SURFACE` | `updateComponents`/`updateDataModel`/`deleteSurface` 的 surfaceId 必须已知 |
| 6 | 安全约束 | `UNSAFE_CONTENT` | 禁止 `<script`、`innerHTML`、`eval(`、`javascript:`、`onXxx=` |

## 9. 上下文信息流完整时序

```text
时间线 ──────────────────────────────────────────────────────────▶

1. 后端组装 AgentRunInput
   │
2. AgentContextBuilder.buildContext(input)
   ├─ 格式化 6 个上下文维度
   └─ 输出 AgentContext
   │
3. PromptComposer.composeInitial(context, options)    ← 第一轮
   ├─ buildBaseSystemPrompt() + buildA2uiProtocolGuide()
   │   ├─ Section 1-9: 固定内容
   │   ├─ Section 4: 组件摘要（仅名称+描述）
   │   └─ Section 10/11: 空（首次无披露内容）
   └─ buildUserPrompt() 拼接 6 个维度
   │
4. ModelClient.generate([system, user])
   │
5. 输出解析 ─┬─ skillInfoRequest?    → discloseSkills()    → 注入 Section 10 → 回到 3
            ├─ componentInfoRequest? → discloseComponents() → 注入 Section 11 → 回到 3
            └─ 最终 JSON             → 进入步骤 6           （最多循环3轮）
   │
6. parseModelOutput() → { assistantMessage, a2uiMessages }
   │
7. validateA2UI(messages, catalogId, currentSnapshot)
   ├─ 6 项校验
   ├─ 通过 + 有消息 → COMMITTED
   ├─ 通过 + 无消息 → TEXT_ONLY
   └─ 未通过 → composeRepair() → 回到步骤 4 (最多3次)
```

## 10. 设计约束与边界

### 10.1 安全性约束

- API Key 不记录到日志（`ModelClient` 中 `apiKey` 仅用于 HTTP Header，不在 log 中出现）
- 禁止生成 `innerHTML`、`eval`、`<script` 等不安全内容（校验第 6 项）
- Skill 内容不来自数据库或本地文件，只来自后端传入的 `AgentRunInput.enabledSkills`

### 10.2 架构边界

- Agent 不直接读文件（上传文件内容由后端提取后传入）
- Agent 不直接写数据库（结果通过返回值传递给后端）
- Agent 不开放 HTTP API（仅作为被调用模块）
- Agent 不依赖 `packages/renderer` 和 `packages/backend`

### 10.3 Token 预算

- 最近消息：最多 20 条，每条截断 2K 字符
- 上传文件：每文件截断 8K 字符
- 渐进式披露：首轮只注入组件摘要（~1K），完整组件详情在需要时才注入
- 最大尝试次数：3 次（含修复），避免无限循环消耗 Token
- 最大披露轮数：3 轮自愿 + 1 轮强制，避免无限请求

## 11. 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/context/context-builder.ts` | 六维度上下文聚合与格式化 |
| `src/prompts/prompt-composer.ts` | System/User/Repair Prompt 组装入口 |
| `src/prompts/a2ui-protocol-guide.ts` | A2UI 协议指南的 12 节动态模板 |
| `src/runtime/agent-runtime.ts` | 主循环、披露循环、修复循环的调度器 |
| `src/runtime/output-parser.ts` | 模型输出 JSON 解析与字段验证 |
| `src/runtime/component-info-request-parser.ts` | 组件详情请求解析 |
| `src/runtime/skill-info-request-parser.ts` | Skill 内容请求解析 |
| `src/model/model-client.ts` | OpenAI-compatible API 客户端 |
| `src/tools/catalog-schema.ts` | 19 个组件的硬编码定义与查询 API |
| `src/tools/validate-a2ui.ts` | 六项 A2UI 校验 |
| `src/logger.ts` | Agent 零依赖 Logger |
| `src/index.ts` | 包导出入口 |
