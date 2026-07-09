# Agent Runtime 模块实现说明 v0.1

## 1. 模块定位

`agent` 是受控 Agent Runtime。它负责把用户意图转换成合法 A2UI v0.9 消息，并通过强制 `validateA2UI` 工具保证只有合法消息才能交给 `backend` 提交。

## 2. 输入文档

- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`
- `docs/development-start.md`
- `docs/agent/tasks.md`

## 3. 已确定技术选型

- 包路径：`packages/agent`
- Runtime：Node.js
- 语言：TypeScript
- 模型接口：OpenAI-compatible API
- 模型调用方式：MVP 非流式调用
- A2UI JSON Schema 校验：Ajv
- API/内部输入结构校验：可复用 shared 类型，必要时使用 Zod
- 测试：Vitest

实现约束：

- `validateA2UI` 使用 Ajv 执行 A2UI/Catalog JSON Schema 校验，并补充 root、child 引用、surface 存在性和安全约束校验。
- ModelClient 不记录 apiKey。
- Agent 不直接访问数据库，由 backend 注入上下文并接收结果。

## 4. 职责边界

负责：

- 构建 Agent 上下文。
- 组织初始 prompt 和 repair prompt。
- 调用 OpenAI-compatible API。
- 解析模型 JSON envelope。
- 调用 `validateA2UI`。
- 最多 3 次生成/修复。
- 返回结构化成功或失败结果。

不负责：

- 不直接访问任意本地路径。
- 不直接写前端状态。
- 不直接开放 HTTP API。
- 不提供外部 HTTP/API 工具。
- 不绕过校验提交 A2UI。

## 5. Prompt 文件边界

- `packages/agent/src/prompts/prompt-composer.ts` 负责拼装 system prompt、user prompt 和 repair prompt。
- `packages/agent/src/prompts/a2ui-protocol-guide.ts` 负责维护 A2UI v0.9 协议教学内容，包括输出 envelope、消息顺序、组件树规则、常用组件字段、页面组织方法、数据绑定、常见错误和标准示例。
- 当发现模型反复生成错误字段（例如 `Tabs.tabs`、`Card.title`、内联 children 对象、Button 字符串 action）时，优先更新协议教学 prompt，再视情况补充校验或 Renderer 兼容。

## 6. Runtime 状态机

- `PREPARE_CONTEXT`
- `GENERATE_DRAFT`
- `VALIDATE_DRAFT`
- `REPAIR_DRAFT`
- `COMMIT`
- `FAILED`

## 7. 输出契约

模型必须返回：

```json
{
  "assistantMessage": "说明文本",
  "a2uiMessages": []
}
```

`a2uiMessages` 非空时必须调用 `validateA2UI`。

## 8. Prompt 生成约束

Prompt 必须同时约束协议合法性和渲染可用性：

- 只能使用 Basic Catalog 组件，不能生成 HTML、JavaScript 或 CSS。
- `surfaceId` 固定使用 `main`，并先 `createSurface`，再 `updateDataModel` 和 `updateComponents`。
- 组件树必须使用邻接表结构，并包含 `id: "root"` 的根组件。
- 生成 UI 时不能把内容堆成一串孤立 `Text`；应优先用 `Column` 作为根，用 `Row`、`Card`、`List`、`Tabs` 等容器组织页面层级。
- 信息密集场景（如课程表、看板、报表）应使用 `Row`/`Column` 表达网格或分组，用 `Card` 包裹重要单元。
- Prompt 中应提供一个合法 JSON 示例，帮助模型学习组件引用、数据绑定和容器组合方式。

## 9. 验收标准

- 成功输出只包含通过校验的 A2UI messages。
- 失败 3 次后返回 `FAILED`。
- 非 JSON 输出被捕获。
- Catalog 外组件被校验工具拒绝或修复。
- Agent 不读取任意本地路径。
