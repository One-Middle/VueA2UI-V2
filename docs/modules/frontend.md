# Frontend 模块说明

## 1. 功能定位

`packages/frontend` 是平台工作台，负责用户可见的创作体验：创建和切换会话、发送需求、上传文件、管理 skills、接收 SSE、驱动 Renderer 预览、查看历史与 Runtime 日志、导出产物。

输入：用户操作、后端 HTTP API、后端 SSE 事件。  
输出：工作台 UI 状态、传给 Renderer 的合法 A2UI 消息、Renderer action/error 回传请求。

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

- 工作台页面、导航和交互状态。
- 会话、消息、文件、skills、历史、Runtime 和导出入口。
- HTTP API 与 SSE 客户端。
- 将已提交 A2UI 消息交给 Renderer。
- 将 Renderer action/error 转发给后端。

不负责：

- 不实现 A2UI 协议渲染核心。
- 不执行 A2UI 校验。
- 不直接访问数据库。
- 不直接调用模型。
- 不修复非法 A2UI。

## 4. 代码工程结构

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
    stream.test.ts
  stores/
    renderer.ts
    workspace.ts
    workspace.test.ts
  views/
    WorkspacePage.vue
  features/
    conversation/
      ConversationPanel.vue
      InitialCreatePanel.vue
      MessageInput.vue
      MessageList.vue
    preview/
      PreviewPanel.vue
    history/
      HistoryPanel.vue
    skills/
      SkillsPanel.vue
    import-export/
      ImportExportPanel.vue
    runtime/
      RuntimePanel.vue
```

## 5. 文件职责说明

| 文件 / 目录 | 作用 |
| --- | --- |
| `src/main.ts` | Vue 应用入口，初始化应用、Pinia、Router、Naive UI 与全局样式。 |
| `src/App.vue` | 根组件，承载路由出口。 |
| `src/router.ts` | 前端路由定义，当前主要指向工作台页面。 |
| `src/styles.css` | 工作台全局样式。 |
| `src/env.d.ts` | Vite / Vue 类型声明。 |
| `src/views/WorkspacePage.vue` | 工作台主布局，组织导航、顶部状态和功能面板。 |
| `src/services/api.ts` | 后端 HTTP API 客户端封装。 |
| `src/services/stream.ts` | SSE 客户端、自动重连和事件分发。 |
| `src/services/stream.test.ts` | SSE 客户端测试。 |
| `src/services/logger.ts` | 前端日志辅助。 |
| `src/stores/workspace.ts` | Pinia 工作台业务状态，管理会话、消息、文件、skills、runtime、导出和异步请求。 |
| `src/stores/workspace.test.ts` | 工作台状态测试。 |
| `src/stores/renderer.ts` | Renderer 桥接状态，区分实时增量、历史快照替换和会话重置。 |
| `src/features/conversation/ConversationPanel.vue` | 创作对话容器，组织消息列表、输入区和发送流程。 |
| `src/features/conversation/InitialCreatePanel.vue` | 无当前会话时的初始创建入口。 |
| `src/features/conversation/MessageInput.vue` | 多行输入框、发送按钮和快捷键处理。 |
| `src/features/conversation/MessageList.vue` | 用户和 assistant 消息列表展示。 |
| `src/features/preview/PreviewPanel.vue` | A2UI 预览面板，创建 Renderer surface group 并展示当前 surface。 |
| `src/features/history/HistoryPanel.vue` | 历史会话、A2UI events 和 snapshot 恢复入口。 |
| `src/features/skills/SkillsPanel.vue` | Skill 创建、编辑、启用和禁用界面。 |
| `src/features/import-export/ImportExportPanel.vue` | 会话、A2UI JSONL 和 snapshot 导出入口。 |
| `src/features/runtime/RuntimePanel.vue` | Runtime 配置、Agent runs 和 tool calls 展示。 |

## 6. 核心流程

发送消息：

1. 用户在 `MessageInput` 输入需求。
2. `ConversationPanel` 调用 `workspace.sendMessage()`。
3. `workspace` 通过 `api.ts` 请求后端消息 API。
4. 后端创建 Agent run 后，通过 SSE 返回状态。
5. `stream.ts` 分发 `assistant_message`、`a2ui_messages` 和 `surface_snapshot`。
6. `renderer` store 将合法 A2UI 消息传给 `PreviewPanel`。

历史恢复：

1. 用户在 `HistoryPanel` 选择会话。
2. `workspace` 加载会话详情和 `currentSnapshot`。
3. 前端生成会话修订号，拦截旧响应和旧 SSE。
4. `renderer` store 以快照全量替换模式重建 Renderer 状态。

## 7. 依赖契约

- API：[../contracts/api.md](../contracts/api.md)
- A2UI：[../contracts/a2ui-v0.9.md](../contracts/a2ui-v0.9.md)
- Shared 类型：[../contracts/shared-types.md](../contracts/shared-types.md)
- 系统边界：[../architecture/system-design.md](../architecture/system-design.md)

## 8. 测试与验收

- `pnpm --filter @a2ui-platform/frontend typecheck`
- `pnpm --filter @a2ui-platform/frontend test`
- 会话切换时旧请求和旧 SSE 不污染当前会话。
- 历史 snapshot 可恢复 Renderer 预览。
- Agent run 失败时不更新 Renderer 正式状态。

## 9. 维护规则

- 修改页面结构、工作台状态或 SSE 消费逻辑时，同步更新本文档。
- 修改 HTTP/SSE 调用时，同步更新 `docs/contracts/api.md`。
- 修改 Renderer 输入模型时，同步更新 `docs/modules/renderer.md`。

## 10. 详细档案索引

更细的历史设计和实现细节维护在 `docs/archive/frontend/`：

- [Frontend 实施说明](../archive/frontend/implementation.md)
- [Frontend 实现细节](../archive/frontend/implementation-details.md)
