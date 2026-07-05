# 跨模块集成任务清单 v0.1

## 1. 目标

本文档定义跨 `frontend`、`frontend/renderer`、`backend`、`agent` 的集成任务。模块内部任务完成后，通过这些任务串起完整端到端链路。

## 2. 输入文档

- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`
- `docs/product/agent-platform-db-schema.md`
- `docs/development-start.md`
- `docs/frontend/tasks.md`
- `docs/frontend/renderer/tasks.md`
- `docs/backend/tasks.md`
- `docs/agent/tasks.md`

## 3. 集成任务

### TASK-INT-001：共享类型契约

- 目标：完善已创建的 `packages/shared`，提供跨模块共享 DTO、A2UI message、SSE event 和 Agent result 类型。
- 当前状态：工程骨架已创建，`packages/shared/src` 已包含 `a2ui.ts`、`api.ts`、`agent.ts`、`sse.ts`、`index.ts` 初稿。
- 依赖任务：工程骨架已创建。
- 涉及模块：frontend、frontend/renderer、backend、agent。
- 实现要求：覆盖 Session、Message、AgentRun、A2UIEvent、SurfaceSnapshot、SSE event、Agent result；供 `packages/frontend`、`packages/renderer`、`packages/backend`、`packages/agent` 通过 `@a2ui-platform/shared` 引用。
- 验收标准：四个模块引用同一批共享类型，不在模块内复制定义共享 DTO。
- 测试要求：类型编译通过。
- 不允许做什么：不让 renderer 依赖 backend 实现；不在业务模块内重复定义跨模块 DTO。

### TASK-INT-002：Mock A2UI 端到端链路

- 目标：用户发送消息后，backend 返回 mock A2UI event，frontend 通过 SSE 交给 Renderer。
- 依赖任务：TASK-FE-004、TASK-FE-005、TASK-FE-006、TASK-BE-005、TASK-BE-006、TASK-BE-007、TASK-REN-007。
- 涉及模块：frontend、frontend/renderer、backend。
- 实现要求：基于 pnpm workspace packages；无需真实模型。
- 验收标准：页面能渲染 mock UI。
- 测试要求：端到端 smoke test。
- 不允许做什么：不接入真实 agent。

### TASK-INT-003：真实 Agent 成功链路

- 目标：接入真实 Agent Runtime，完成生成、校验、提交、渲染。
- 依赖任务：TASK-INT-002、TASK-AG-007、TASK-BE-008。
- 涉及模块：backend、agent、frontend、frontend/renderer。
- 实现要求：Express backend 调用 `packages/agent`；成功 run 创建 assistant message、A2UI event、surface snapshot。
- 验收标准：用户自然语言生成首个合法 UI。
- 测试要求：至少一个稳定 prompt 通过。
- 不允许做什么：不把未校验草稿推给前端。

### TASK-INT-004：真实 Agent 失败链路

- 目标：模拟 validateA2UI 三次失败，验证失败行为。
- 依赖任务：TASK-AG-007、TASK-BE-007、TASK-FE-009。
- 涉及模块：backend、agent、frontend。
- 实现要求：不创建 A2UI event 和 snapshot。
- 验收标准：前端展示失败消息和 validation errors。
- 测试要求：失败端到端测试。
- 不允许做什么：不让 Renderer 更新。

### TASK-INT-005：文件进入 Agent 上下文

- 目标：上传 `.txt` 后，发送消息时文件内容进入 Agent context。
- 依赖任务：TASK-FE-007、TASK-BE-009、TASK-AG-002。
- 涉及模块：frontend、backend、agent。
- 实现要求：模型不能自由读取路径，文件内容由 backend 注入。
- 验收标准：Agent context 中出现文件内容摘要或全文。
- 测试要求：有附件和无附件两种 run。
- 不允许做什么：不允许任意本地文件读取。

### TASK-INT-006：Skill 进入 Agent 上下文

- 目标：会话启用 skill 后，Agent run 包含 skill 内容。
- 依赖任务：TASK-FE-008、TASK-BE-010、TASK-AG-002。
- 涉及模块：frontend、backend、agent。
- 实现要求：skills 只作为文本指导，不改变 Catalog 约束。
- 验收标准：Agent context 包含启用 skills。
- 测试要求：启用、禁用后上下文变化。
- 不允许做什么：不执行 skill 代码。

### TASK-INT-007：Renderer action 回传

- 目标：Button action 从 Renderer 派发到 backend 并记录。
- 依赖任务：TASK-REN-007、TASK-FE-006、TASK-BE-011。
- 涉及模块：frontend/renderer、frontend、backend。
- 实现要求：MVP 只记录，不触发 Agent。
- 验收标准：点击按钮后 `renderer_events` 有记录。
- 测试要求：合法 action、非法 action。
- 不允许做什么：不自动调用外部 API。

### TASK-INT-008：导出链路

- 目标：完整导出 session、A2UI JSONL、snapshot。
- 依赖任务：TASK-FE-010、TASK-BE-012。
- 涉及模块：frontend、backend。
- 实现要求：不导出 API key 和敏感 prompt。
- 验收标准：导出文件格式符合 API 文档。
- 测试要求：空会话、有数据会话。
- 不允许做什么：不导出未校验草稿。

## 4. 并行策略

可以并行启动：

- Renderer：从 mock A2UI messages 开始。
- Backend：从 DB/API 和 mock agent 开始。
- Agent：从 mock backend context 开始。
- Frontend：从 mock API/SSE 和 mock Renderer 开始。

首个集成里程碑：

- TASK-INT-002：Mock A2UI 端到端链路。

第二个集成里程碑：

- TASK-INT-003：真实 Agent 成功链路。

第三个集成里程碑：

- TASK-INT-004：真实 Agent 失败链路。
