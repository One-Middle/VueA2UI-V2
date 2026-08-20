# Frontend 模块说明

## 1. 功能定位

`packages/frontend` 是平台工作台，负责用户可见的创作、调试和管理体验：创建和切换会话、发送需求、上传文件、管理 Skills、接收 SSE、驱动 Renderer 预览、查看历史、查看 Runtime 过程、导出产物。

它不实现 A2UI 协议渲染核心，而是把后端已提交的 A2UI messages 交给 `packages/renderer`，并把 Renderer 派发的 action/error 转发给后端记录。

## 2. 技术栈

- 包路径：`packages/frontend`
- 框架：Vue 3
- 构建工具：Vite
- 语言：TypeScript
- 路由：Vue Router
- 状态管理：Pinia
- UI 组件库：Naive UI
- 测试：Vitest、vue-tsc
- 依赖模块：`@a2ui-platform/shared`、`@a2ui-platform/renderer`

## 3. 职责边界

负责：

- 工作台页面、导航和面板交互。
- 会话、消息、文件、Skills、Agent runs、A2UI events、snapshots 和导出的 UI 状态管理。
- HTTP API 调用和 SSE 客户端连接。
- 会话切换时的请求/事件竞态防护。
- 将 committed A2UI messages 或 snapshot 还原 messages 传给 Renderer。
- 监听 `a2ui:action` / `a2ui:error` 并调用后端回传 API。
- 在预览面板提供 component/dataModel JSON 检视和本地编辑调试。

不负责：

- 不执行 A2UI 校验。
- 不生成或修复 A2UI。
- 不直接访问数据库。
- 不直接调用模型。
- 不把 Renderer 内部 `SurfaceGroupModel` 放入全局 Pinia。

## 4. 真实工程结构

```text
packages/frontend/src/
  App.vue
  env.d.ts
  main.ts
  router.ts
  styles.css
  services/
    api.ts
    logger.ts
    stream.ts
    __tests__/
  stores/
    renderer.ts
    workspace.ts
    __tests__/
  views/
    WorkspacePage.vue
  features/
    conversation/
      ConversationPanel.vue
      InitialCreatePanel.vue
      MessageInput.vue
      MessageList.vue
    history/
      HistoryPanel.vue
    import-export/
      ImportExportPanel.vue
    preview/
      PreviewPanel.vue
    runtime/
      RuntimePanel.vue
    skills/
      SkillsPanel.vue
```

## 5. 关键文件职责

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/main.ts` | Vue 应用入口，初始化 Pinia、Router、Naive UI 和全局样式。 |
| `src/App.vue` | 根组件，承载路由出口。 |
| `src/router.ts` | 前端路由定义，当前主要指向工作台页面。 |
| `src/views/WorkspacePage.vue` | 工作台主布局，组织导航、顶部状态和各功能面板。 |
| `src/services/api.ts` | HTTP API client，封装 JSON 请求、文件上传和下载。 |
| `src/services/stream.ts` | SSE client，负责连接、重连和事件分发。 |
| `src/stores/workspace.ts` | 工作台业务 store，管理会话、消息、文件、Skill、Agent run、A2UI event、snapshot 和 SSE 状态。 |
| `src/stores/renderer.ts` | Renderer 桥接 store，仅保存待消费 A2UI messages、revision、changeKind 和 ready 状态。 |
| `src/features/conversation/*` | 用户对话、初始创建、消息列表和输入框。 |
| `src/features/preview/PreviewPanel.vue` | Renderer 集成点，创建 `SurfaceGroupModel` 和 `MessageProcessor`，监听 action/error，并提供 JSON inspector。 |
| `src/features/history/HistoryPanel.vue` | 历史会话、A2UI events 和 snapshot 恢复入口。 |
| `src/features/skills/SkillsPanel.vue` | Skill 创建、编辑、启用和禁用。 |
| `src/features/runtime/RuntimePanel.vue` | Runtime 配置、Agent runs 和 tool calls 展示。 |
| `src/features/import-export/ImportExportPanel.vue` | 会话、A2UI JSONL 和 snapshot 导出入口。 |

## 6. 状态模型

`workspace` store 保存业务状态：

- 当前 tab、active session、SSE 状态、会话 hydration 状态和 `_sessionRevision`。
- sessions、messages、uploadedFiles、skills、enabledSkillIds。
- agentRuns、runtimeToolCalls、runtimeTraceEvents、workflows、a2uiEvents、surfaceSnapshots。
- `isSending` 和 `isGenerating`。

`renderer` store 保存桥接状态：

- `a2uiMessages`：累积传给 Renderer 的消息。
- `revision`：消息变更版本号。
- `changeKind`：`append`、`replace` 或 `reset`。
- `rendererReady`：Renderer 是否就绪。

`SurfaceGroupModel` 和 `MessageProcessor` 只在 `PreviewPanel.vue` 内部持有，避免把复杂响应式模型混入全局业务 store。

## 7. 核心流程

### 发送消息

1. 用户在 `MessageInput` 输入需求。
2. `ConversationPanel` 调用 `workspace.sendMessage()`。
3. 若当前没有会话，`workspace` 先自动创建会话，标题由消息前 24 个字符生成。
4. `api.sendMessage()` 请求后端消息 API。
5. 若后端返回 `workflow` 摘要（包括 `failed_retryable` workflow 被普通消息恢复为 `running`），`workspace` 会先 `upsertWorkflow()` 更新本地状态；若返回 `agentRun` 或 workflow 已 running，则设置 `isGenerating = true`。
6. 后端创建 Agent run 后通过 SSE 推送进度。
7. `stream.ts` 分发 `agent_run_started`、`agent_run_attempt`、`assistant_message`、`a2ui_messages`、`surface_snapshot` 等事件。
8. `workspace` 更新业务状态，`renderer.processMessages()` 追加 A2UI messages。
9. `PreviewPanel` 观察 renderer revision，并用 `MessageProcessor` 消费新增 messages。

### Workflow 交互

1. `WorkflowPanel` 读取 `workspace.workflows` 的当前 workflow 与最新 step/artifact。
2. 依据 step 的 `status` / `stageState` 展示 clarification form 或 decision form。
3. `submitWorkflowClarification` / `submitWorkflowDecision` / `retryWorkflowStep` 通过 `sendWorkflowAction` 调 `POST /workflow/actions`，并用返回的 workflow 更新本地状态。
4. candidate artifact 可通过「恢复候选预览」调用 `renderer.replaceMessages` 在 PreviewPanel 中预览。
5. `agent_trace_event` SSE 会累积到 `runtimeTraceEvents`，供后续 trace 展示使用。

### 会话切换与恢复

1. `setActiveSessionId()` 先断开旧 SSE，清空旧业务数据并重置 Renderer。
2. `_sessionRevision` 递增，用于过滤旧请求和旧 SSE。
3. 并行加载消息、文件、Agent runs、A2UI events、snapshots 和会话详情。
4. `loadSessionDetail()` 读取 `currentSnapshot` 后，通过 `snapshotToRendererMessages()` 还原为 `createSurface → updateComponents → updateDataModel`。
5. `renderer.replaceMessages()` 触发 `PreviewPanel` 全量重建 Renderer 状态。

### Renderer 回传

1. Basic 组件触发 action 或 error。
2. Renderer 在 `window` 上派发 `a2ui:action` 或 `a2ui:error`。
3. `PreviewPanel` 校验事件结构为 A2UI v0.9 client message。
4. 前端调用 `api.recordAction()` 或 `api.recordError()`。
5. 后端只记录 Renderer event，不在当前链路内执行业务副作用。

## 8. 已知对齐点

- `api.ts` 的 `getRuntimeConfig()` 与后端 `GET /api/runtime/config` 对齐。
- `api.ts` 当前有 `updateRuntimeConfig()`，但后端尚未实现 `PATCH /api/runtime/config`。
- 前端只把 committed A2UI messages 或 current snapshot 交给 Renderer；Agent 失败消息不会更新 Renderer 正式状态。
- `agent_trace_event` SSE 事件已累积到 `workspace.runtimeTraceEvents`，但当前面板（Runtime / Workflow）尚未渲染该 trace；仅为后续 trace 展示预留状态。

## 9. 测试与验收

- `pnpm --filter @a2ui-platform/frontend typecheck`
- `pnpm --filter @a2ui-platform/frontend test`
- 会话切换时旧请求和旧 SSE 不应污染当前会话。
- 历史 snapshot 应能恢复 Renderer 预览。
- Agent run 失败时不应向 Renderer 追加 A2UI messages。
- Renderer action/error 应通过前端 API 转发给后端。
- component/dataModel inspector 的本地 JSON 错误应留在预览面板内，不破坏后端状态。

## 10. 维护规则

- 修改 HTTP API 调用时，同步检查 Backend 路由和 [api.md](../../../30-contracts/api.md)。
- 修改 SSE 消费逻辑时，同步检查 Shared `sse.ts` 和 Backend `stream.service.ts`。
- 修改 Renderer 输入模型时，同步更新 Renderer 模块说明。
- 修改会话恢复逻辑时，同步检查 snapshot 契约和 Integration 文档。

## 11. 相关文档

- [API 契约](../../../30-contracts/api.md)
- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [Shared 类型契约](../../../30-contracts/shared-types.md)
- [Renderer 模块说明](../renderer/README.md)
- [Integration 模块说明](../integration/README.md)


