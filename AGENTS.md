# AGENTS.md

## 项目概述

本项目是一个全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端 Agent Runtime 生成 A2UI v0.9 消息，经 `validateA2UI` 校验通过后提交，前端 Vue3 Renderer 渲染 UI。

所有项目文档必须使用中文。

## 技术栈

- Monorepo：pnpm workspace
- 包目录：`packages/*`
- 前端：Vue 3 + Vite + Vue Router + Pinia + Naive UI
- Renderer：Vue 3 + A2UI v0.9
- 后端：Node.js + Express + Prisma + PostgreSQL
- Agent：Node.js / TypeScript + OpenAI-compatible API
- API DTO 校验：Zod
- A2UI JSON Schema 校验：Ajv
- 日志：pino
- 文件上传：multer
- 测试：Vitest

## 包结构

```text
packages/
  shared/     # 共享类型、DTO、A2UI message、SSE event、Agent result
  renderer/   # Vue3 A2UI Renderer
  frontend/   # 平台工作台
  backend/    # Express API、Prisma、SSE、文件和业务编排
  agent/      # Agent Runtime、Prompt、ModelClient、validateA2UI
```

## 必读文档

全局契约：

- `docs/development-start.md`
- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`
- `docs/product/agent-platform-db-schema.md`
- `docs/product/agent-platform-module-specs.md`

模块文档：

- Frontend：`docs/frontend/frontend-implementation.md`、`docs/frontend/tasks.md`
- Renderer：`docs/frontend/renderer/renderer-implementation.md`、`docs/frontend/renderer/tasks.md`
- Backend：`docs/backend/backend-implementation.md`、`docs/backend/tasks.md`
- Agent：`docs/agent/agent-runtime-implementation.md`、`docs/agent/tasks.md`
- 集成：`docs/product/tasks/integration-tasks.md`

## 开发原则

- 先共享类型，后模块并行。
- 先 mock 链路，后真实模型。
- 先最小闭环，后补齐组件。
- 后端只提交通过 `validateA2UI` 的 A2UI 消息。
- Renderer 不接收未通过后端校验的消息作为正式状态。
- Agent 不生成任意 HTML、JavaScript 或 CSS。
- MVP 不做登录。
- MVP 不提供外部 HTTP/API 工具。
- MVP 固定 Basic Catalog，但保留 `catalogId` 和 `catalogVersion`。
- 文件读取只允许用户上传的 `.txt` 文件。

## 模块边界

### `packages/frontend`

负责工作台 UI、路由、Pinia 状态、Naive UI 界面、HTTP API 调用、SSE 接收、Renderer 接入和导入导出入口。

不负责：

- A2UI 协议渲染核心。
- 模型调用。
- A2UI 校验。
- 数据库访问。

### `packages/renderer`

负责 A2UI v0.9 消息处理、surface/component/data model、Vue3 渲染、Basic Catalog 组件、action/error 派发。

不负责：

- 后端 API 调用。
- 会话持久化。
- Agent 修复逻辑。
- 工作台业务状态。

### `packages/backend`

负责 Express API、Prisma、PostgreSQL、SSE、文件上传、skills、events、snapshots、Renderer action/error 记录和 Agent run 编排。

不负责：

- 直接调用 OpenAI-compatible API。
- 直接生成 A2UI 草稿。
- 绕过 Agent/validateA2UI 提交模型输出。

### `packages/agent`

负责 Agent Runtime、上下文构建、prompt、模型调用、输出解析、`validateA2UI` 和三次修复循环。

不负责：

- 直接写数据库。
- 直接访问任意本地路径。
- 开放 HTTP API。
- 外部 HTTP/API 工具。

### `packages/shared`

负责共享类型。跨模块类型应优先放在这里，避免各模块重复定义 DTO。

当前骨架包含：

- `src/a2ui.ts`：A2UI v0.9 message、component、surface 相关类型。
- `src/api.ts`：API request/response DTO 类型。
- `src/agent.ts`：Agent input、result、validation、tool call 类型。
- `src/sse.ts`：SSE event 类型。
- `src/index.ts`：统一导出入口。

跨包契约变更必须先更新 `packages/shared`，再更新调用方；不要在业务模块内复制定义共享 DTO。

## 推荐开工顺序

1. `TASK-INT-001`：完善 `packages/shared` 共享类型契约。
2. `TASK-INT-002`：Mock A2UI 端到端链路。
3. Renderer 最小闭环：DataModel、SurfaceModel、MessageProcessor、Text/Row/Column/Button/TextField。
4. Backend 基础 API：sessions、messages、agent_runs、a2ui_events、surface_snapshots、SSE。
5. Frontend 工作台：tabs、对话、预览、SSE 接入。
6. Agent Runtime：ContextBuilder、PromptComposer、ModelClient、validateA2UI、修复循环。
7. 文件、skills、导入导出和调试面板。

## 命令约定

依赖安装后可使用：

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
```

当前环境可能尚未安装 pnpm 或依赖；如果命令不可用，应先说明原因，不要假装已验证。

## 代码规范

- 使用 TypeScript。
- 优先复用 `packages/shared` 类型。
- 跨模块类型变更先改 `packages/shared`，再改模块实现。
- API 请求/响应遵守 `docs/product/agent-platform-api.md`。
- Prisma schema 遵守 `docs/product/agent-platform-db-schema.md`。
- 前端业务状态使用 Pinia。
- Renderer 内部状态不得放入 Pinia。
- API DTO 使用 Zod。
- A2UI JSON Schema 校验使用 Ajv。
- 后端日志使用 pino，避免散落 `console.log`。
- 文件上传使用 multer。

## 禁止事项

- 不要在未更新文档的情况下新增产品能力。
- 不要生成或执行任意 HTML/JS/CSS 作为 Agent 输出。
- 不要让模型自由读取本地路径。
- 不要把 API key 写入数据库或前端环境变量。
- 不要把未通过校验的 A2UI 草稿写入 `a2ui_events`。
- 不要让 `packages/renderer` 依赖 `packages/backend`。
