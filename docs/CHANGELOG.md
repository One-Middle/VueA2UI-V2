# 更新日志

## 2026-07-12

### 文档结构

- 重构 `docs/` 文档体系，新增 `overview`、`product`、`architecture`、`contracts`、`modules`、`tasks`、`archive` 分层。
- 将旧版重复文档归档到 `docs/archive/legacy-2026-07/`，仅作为历史参考，不再作为当前实现契约。
- 重写 `docs/README.md`，明确“一个事实只有一个权威位置”的维护规则。
- 新增 `docs/modules/frontend.md`、`renderer.md`、`backend.md`、`agent.md`、`shared.md`、`integration.md`，统一记录模块功能定位、技术栈、代码工程结构和文件职责。
- 新增 `docs/contracts/api.md`、`db-schema.md`、`a2ui-v0.9.md`、`shared-types.md`，作为跨模块契约入口。
- 精简 `AGENTS.md`，移除旧文档路径、重复模块说明和过细模板，保留 AI 协作所需的入口文档、开发原则、文档维护和代码规范。

### 代码规范

- 更新 AGENTS.md 注释规范：统一中文 JSDoc 格式、文件头注释模板、方法注释要求、区块分隔线规范。
- 为 `packages/shared/src/agent.ts`、`sse.ts`、`api.ts` 补充文件头注释和字段级 JSDoc。
- 为 `packages/backend/src/app.ts`、`server.ts`、`services/session.service.ts` 补充文件头注释和方法 JSDoc。
- 为 `packages/agent/src/runtime/agent-runtime.ts`、`tools/validate-a2ui.ts` 补充文件头注释和方法 JSDoc。
- 为 `packages/frontend/src/stores/workspace.ts` 补充文件头注释和所有 action/辅助函数 JSDoc。
- 修复 `packages/agent/src/tools/catalog-schema.ts` 的两处悬空 JSDoc 注释缺陷，并补充文件头注释。

### Frontend

- 修复从“历史记录”切换会话后组件不恢复的问题：Renderer 改用显式修订号感知输入变化，不再依赖 A2UI 消息数量变化。
- 建立历史会话水合事务，使用会话 ID 与会话修订号拦截旧请求响应和旧 SSE Renderer 事件，避免快速切换时发生跨会话状态污染。
- Renderer 输入区分历史快照全量替换、实时消息增量追加和会话重置；全量重建后同步恢复 data model 订阅，实时更新不再重复回放全部历史消息。
- 历史详情恢复失败时在预览区展示明确错误，不再静默退化为空白预览。

### Backend

- 修复 Agent 提交事务内生成空 snapshot 的根因：A2UI event 回放现在复用同一个 Prisma 事务客户端，确保刚写入的 committed event 对快照计算可见。
- 新增 `pnpm --filter @a2ui-platform/backend repair:snapshots` 数据修复命令，从 committed A2UI events 重新物化 current snapshot，用于修复受旧事务可见性问题影响的历史会话。

## 2026-07-09

### Agent Runtime

- 将 Agent 组件上下文改为渐进式披露：初始 Prompt 只暴露 Basic Catalog 组件名称和一句话用途摘要，不再一次性注入全部组件字段说明。
- 新增 `componentInfoRequest` 中间输出协议，允许 LLM 结构化请求所需组件详情。
- Runtime 新增最多 3 轮组件详情披露循环，解析请求后通过 `getComponentDef()` 获取组件字段、必填项、类型和枚举值，并注入下一轮 Prompt。
- 新增 `getCatalogComponentDetails` ToolCall 记录，用于观测请求组件、跳过组件、已披露组件和本轮实际披露组件。
- 修复流程继续复用已披露组件详情，并强制输出最终 `{ assistantMessage, a2uiMessages }`，不改变 Agent 最终结果契约。

### 测试与文档

- 新增 Agent 渐进式披露单元测试，覆盖 Prompt、`componentInfoRequest` parser 和 Runtime 主路径。
- 更新 Agent 相关文档，说明新的上下文构成、组件详情披露状态机和任务验收标准。

### Frontend

- 修复实时预览可能空白的问题：`surface_snapshot` SSE 到达时同步恢复 Renderer 输入，避免仅依赖 `a2ui_messages` 事件导致预览状态丢失。
- Renderer store 新增快照恢复用的消息替换入口，避免恢复当前快照时重复累积历史消息。
- 修复 `Card.children` 非法字段漏过 Agent 校验导致卡片内容不渲染的问题；未来输出会被 `validateA2UI` 拦截并进入修复循环。
- Renderer 的 Card 增加历史数据兼容：当旧事件使用 `children` 且没有 `child` 时，仍可渲染其子组件内容。
