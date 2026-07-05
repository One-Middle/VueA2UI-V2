# Agent Runtime 模块任务清单 v0.1

## 1. 模块边界

本任务清单只覆盖 `agent` Runtime，不包含 backend controller、frontend 页面和 Renderer 组件实现。

## 2. 依赖契约

必须遵守：

- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`
- `docs/development-start.md`
- `docs/agent/agent-runtime-implementation.md`

可并行前置条件：

- backend 可通过 mock input 调用 agent。
- validateA2UI 可先实现最小校验。

## 3. 任务列表

### TASK-AG-001：定义 Agent 输入输出类型

- 目标：定义 run input、attempt、result、validation result。
- 依赖任务：无。
- 涉及文件区域：`packages/agent/src/runtime`、`packages/shared`。
- 实现要求：支持成功、失败、仅文本回复三类结果。
- 验收标准：backend 可类型安全调用。
- 测试要求：类型级或基础单元测试。
- 不允许做什么：不定义 HTTP API。

### TASK-AG-002：AgentContextBuilder

- 目标：组装用户输入、消息、snapshot、文件、skills、Catalog 摘要。
- 依赖任务：TASK-AG-001。
- 涉及文件区域：`packages/agent/src/context`。
- 实现要求：不读取任意路径，文件内容来自 backend input。
- 验收标准：上下文包含 PRD 要求字段。
- 测试要求：空 snapshot、有文件、有 skills。
- 不允许做什么：不直接访问数据库。

### TASK-AG-003：PromptComposer

- 目标：生成初始 prompt 和 repair prompt。
- 依赖任务：TASK-AG-002。
- 涉及文件区域：`packages/agent/src/prompts`。
- 实现要求：包含固定 Catalog 限制、禁止 HTML/JS/CSS、输出契约。
- 验收标准：repair prompt 聚焦错误，不重新发散。
- 测试要求：快照测试或字符串断言。
- 不允许做什么：不把 apiKey 放入 prompt。

### TASK-AG-004：ModelClient

- 目标：封装 OpenAI-compatible API 非流式调用。
- 依赖任务：TASK-AG-001。
- 涉及文件区域：`packages/agent/src/model`。
- 实现要求：支持 baseUrl、apiKey、model、temperature、maxTokens、timeout。
- 验收标准：成功、失败、超时可处理。
- 测试要求：mock fetch/client。
- 不允许做什么：不在日志中输出 apiKey。

### TASK-AG-005：模型输出解析

- 目标：解析 JSON envelope。
- 依赖任务：TASK-AG-004。
- 涉及文件区域：`packages/agent/src/runtime`。
- 实现要求：校验 `assistantMessage` string、`a2uiMessages` array。
- 验收标准：非 JSON 和缺字段被捕获。
- 测试要求：合法、非法、空 messages。
- 不允许做什么：不从 Markdown 中猜测多个 JSON。

### TASK-AG-006：validateA2UI 最小校验

- 目标：使用 Ajv 实现消息结构和 Catalog JSON Schema 校验，并补充 root、child 引用校验。
- 依赖任务：TASK-AG-001。
- 涉及文件区域：`packages/agent/src/tools/validate-a2ui`。
- 实现要求：使用 Ajv；返回 `{ valid, errors, warnings, normalizedMessages }`；拒绝 Catalog 外组件和任意 HTML/JS。
- 验收标准：未知组件和非法 child 返回 errors。
- 测试要求：合法样例、未知组件、缺 root。
- 不允许做什么：不接受任意 HTML/JS。

### TASK-AG-007：Runtime 状态机

- 目标：串联生成、校验、修复、提交候选、失败。
- 依赖任务：TASK-AG-002、TASK-AG-003、TASK-AG-004、TASK-AG-005、TASK-AG-006。
- 涉及文件区域：`packages/agent/src/runtime`。
- 实现要求：最多 3 次 attempt。
- 验收标准：成功校验后停止；3 次失败返回 FAILED。
- 测试要求：一次成功、修复后成功、三次失败。
- 不允许做什么：不输出未校验 A2UI。

### TASK-AG-008：Tool call 记录回调

- 目标：每次 validateA2UI 调用向 backend 回调工具日志。
- 依赖任务：TASK-AG-007。
- 涉及文件区域：`packages/agent/src/runtime`。
- 实现要求：传出 toolName、attemptIndex、status、output。
- 验收标准：backend 可写入 `tool_calls`。
- 测试要求：回调被调用。
- 不允许做什么：不直接写数据库。

### TASK-AG-009：失败结果规范化

- 目标：统一失败 reason、assistantMessage、validation summary。
- 依赖任务：TASK-AG-007。
- 涉及文件区域：`packages/agent/src/runtime`。
- 实现要求：符合 API 文档 `agent_run_failed` 需要的信息。
- 验收标准：前端能展示失败说明。
- 测试要求：模型失败、解析失败、校验失败。
- 不允许做什么：不把完整敏感 prompt 返回前端。
