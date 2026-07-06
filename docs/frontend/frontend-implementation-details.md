# Frontend 模块实现详情 v0.1

## 1. 模块概述

`packages/frontend` 是 Vue 3 + Vite + Naive UI + Pinia 的工作台应用，提供 6 个功能面板：对话、预览、历史、Skills、导入导出、Runtime。

## 2. 文件结构

```text
src/
  main.ts                                 # Vue 应用入口
  App.vue                                 # 根组件（<router-view />）
  router.ts                               # 单路由 "/" → WorkspacePage
  styles.css                              # 全局工作台样式
  services/
    api.ts                                # 20 个 API 函数 + fetch 封装
    stream.ts                             # SSE 客户端 + 自动重连
  stores/
    workspace.ts                          # 核心业务状态（20 actions）
    renderer.ts                           # 独立 Renderer 状态
  views/
    WorkspacePage.vue                     # 主布局：左栏菜单 + 右栏面板
  features/
    conversation/
      ConversationPanel.vue              # 对话容器
      MessageList.vue                    # 消息气泡列表
      MessageInput.vue                   # 多行输入框
    preview/
      PreviewPanel.vue                   # A2UI 渲染预览
    history/
      HistoryPanel.vue                   # 会话列表 + Events
    skills/
      SkillsPanel.vue                    # Skill CRUD + 启用管理
    runtime/
      RuntimePanel.vue                   # 配置 + Agent Runs
    import-export/
      ImportExportPanel.vue              # 三种导出方式
```

## 3. 页面结构

两栏布局（Naive UI `NLayout has-sider`）：

- **左侧栏**（220px）：品牌名 + `NMenu`（6 个 tab）
  - 对话（conversation）、预览（preview）、历史（history）
  - Skills、导入导出（import-export）、Runtime
- **右侧内容区**：header（tab 标题）+ main（按 `activeTab` 条件渲染对应面板）

## 4. 6 个功能模块

### 4.1 对话模块

运行时序：
1. 用户输入 + Ctrl+Enter → `MessageInput` emit `send`
2. `ConversationPanel.send()` → `workspace.sendMessage(content)`
3. `isSending` 为 true 时显示 `NSpin`
4. SSE 收到 `assistant_message` / `a2ui_messages` → 更新 `messages` 和 `renderer`

组件：
- **MessageList**：`NScrollbar` + 气泡式渲染，user 居右蓝色，assistant 居左灰色，自动滚动到底部
- **MessageInput**：`NInput` textarea（3 行），Ctrl+Enter 发送，发送后清空

### 4.2 预览模块

Renderer 集成流程：
1. `registerBasicCatalog()` 注册 17 个组件
2. 创建 `SurfaceGroupModel` → `MessageProcessor`
3. `watch(renderer.a2uiMessages.length)` → `messageProcessor.processMessages()`
4. 有内容时渲染 `<A2uiSurface surface-id="main" :surface-group="surfaceGroup">`
5. `onBeforeUnmount` → `surfaceGroup.destroy()`

### 4.3 历史模块

`NTabs` 两个子 Tab：
- **会话列表**：显示 sessions（title/status/modelName/时间），点击切换
- **A2UI Events**：显示 sequence/surfaceIds/消息数量/时间

### 4.4 Skills 模块

- 创建 Skill：`NModal` + `NForm`（name/description/content）
- Skill 列表：每项显示 name/active标签/描述/version，右侧 `NSwitch` 切换启用
- `workspace.enableSkill()` / `workspace.disableSkill()` 管理 session_skills

### 4.5 Runtime 模块

- 配置卡片：显示 modelName/temperature/maxTokens/maxAttempts/catalogId
- Agent Runs 表格：`NDataTable` 显示 status（带颜色 NTag）/attemptCount/modelName/startedAt/failureReason

### 4.6 导入导出模块

三个按钮：
- 导出会话 JSON：调用 `api.exportSession()` → Blob 下载
- 导出 A2UI JSONL：调用 `api.downloadA2UIJSONL()` → 服务端 Blob
- 导出 Snapshot：调用 `api.downloadSnapshot()` → 服务端 Blob

## 5. 状态管理

### useWorkspaceStore ("workspace")

中央业务状态，管理 13 个 state 字段 + 20 个 actions：

| 分类 | State | 说明 |
|------|-------|------|
| UI | activeTab, activeSessionId, streamStatus, isSending | 界面状态 |
| 业务 | sessions, messages, uploadedFiles, skills, enabledSkillIds | 核心数据 |
| 日志 | agentRuns, a2uiEvents, surfaceSnapshots | 运行时记录 |
| 连接 | _streamConnection | SSE 控制器（不持久化） |

所有 actions 均为 async，通过 `services/api.ts` 与后端通信，try/catch 静默处理查询失败。

### useRendererStore ("renderer")

独立于 workspace 的轻量 store：
- `a2uiMessages: A2UIServerMessage[]` — 累积的 A2UI 消息
- `processMessages(msgs)` — 追加展开
- `reset()` — 切换 session 时清空

## 6. API 集成

`services/api.ts` 封装 20 个端点函数，覆盖 6 大领域：
- Runtime 配置（2）
- 会话（4）、消息（2）、Agent Run（2）
- 文件（4）、Skills（5）
- A2UI/Snapshots（3）、Renderer 回传（2）
- 导入导出（3）

基础 URL：`VITE_API_BASE_URL` 环境变量（默认 `/api`）

## 7. SSE 事件处理

`services/stream.ts` 使用 `fetch + ReadableStream`：
- 自动重连（最多 5 次，间隔 3 秒）
- `Last-Event-ID` header 支持断点恢复
- 返回 `StreamConnection` 对象提供 `close()` 方法

Store 中注册的事件处理器：

| SSE 事件 | 处理逻辑 |
|---------|---------|
| heartbeat | streamStatus = "connected" |
| agent_run_started | 添加/更新 agentRun |
| agent_run_attempt | 更新 attemptCount |
| assistant_message | 追加消息 + 重新加载列表 |
| a2ui_messages | `renderer.processMessages()` + 追加 event |
| surface_snapshot | 追加/更新 snapshot，重排 isCurrent |
| agent_run_failed | 更新失败状态 + 追加失败消息 |
