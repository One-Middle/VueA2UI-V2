# 全栈 Agent 平台开发启动说明 v0.1

## 1. 目的

本文档用于指导全栈 Agent 平台进入编码阶段。它说明当前已确定的技术栈、monorepo 结构、并行开工方式、各编码 Agent 应读取的文档，以及少量仍需在工程初始化时确认的细节。

## 2. 已确定技术栈

### 2.1 前端

- 框架：Vue 3
- 构建工具：Vite
- 语言：TypeScript
- 路由：Vue Router
- 状态管理：Pinia
- UI 组件库：Naive UI
- 测试：Vitest

### 2.2 前端 Renderer

- 框架：Vue 3
- 协议：A2UI v0.9
- Catalog：MVP 固定 Basic Catalog
- 测试：Vitest

### 2.3 后端

- Runtime：Node.js
- Web 框架：Express
- 数据库：PostgreSQL
- ORM：Prisma
- API DTO 校验：Zod
- A2UI JSON Schema 校验：Ajv
- 日志库：pino
- 文件上传中间件：multer
- 数据库迁移：Prisma migrate + 必要 SQL migration
- 测试：Vitest

### 2.4 Agent

- Runtime：Node.js / TypeScript
- 模型接口：OpenAI-compatible API
- 调用方式：MVP 阶段使用非流式模型调用
- 校验：本地 `validateA2UI` 工具
- 测试：Vitest

### 2.5 仓库结构

采用 monorepo，根目录下使用 `packages` 组织模块。

包管理器使用 `pnpm workspace`。

建议结构：

```text
packages/
  frontend/
  renderer/
  backend/
  agent/
  shared/

docs/
  product/
  frontend/
  frontend/renderer/
  backend/
  agent/
```

模块含义：

- `packages/frontend`：平台工作台。
- `packages/renderer`：Vue3 A2UI Renderer。
- `packages/backend`：Express API、Prisma、SSE、文件和业务编排。
- `packages/agent`：Agent Runtime、Prompt、ModelClient、validateA2UI。
- `packages/shared`：共享类型、DTO、A2UI message 类型、SSE event 类型。

## 3. 开工前必须遵守的全局契约

所有模块都必须遵守：

- `docs/product/agent-platform-prd.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`
- `docs/product/agent-platform-db-schema.md`
- `docs/product/agent-platform-module-specs.md`

关键约束：

- MVP 不做登录。
- Agent 不生成任意 HTML、JavaScript 或 CSS。
- MVP 不提供外部 HTTP/API 工具。
- MVP 固定 Basic Catalog。
- 未通过 `validateA2UI` 的消息不能进入 Renderer 正式状态。
- 模型生成阶段不直接流式推送给前端。
- 文件读取只支持用户上传的 `.txt` 文件。
- 跨模块类型必须优先进入 `packages/shared`，业务模块内不重复定义共享 DTO。

## 4. 编码 Agent 派发方式

### 4.1 Frontend Agent

重点读取：

- `docs/frontend/frontend-implementation.md`
- `docs/frontend/tasks.md`
- `docs/product/agent-platform-api.md`

负责：

- 工作台布局。
- 会话和消息界面。
- SSE 接入。
- Renderer 预览接入。
- 文件上传入口。
- Skills、Runtime、导入导出界面。

### 4.2 Renderer Agent

重点读取：

- `docs/frontend/renderer/renderer-implementation.md`
- `docs/frontend/renderer/tasks.md`
- `docs/frontend/renderer/a2ui-renderer-v0_9-guide.md`
- `docs/frontend/renderer/protocol/A2UI协议认识.md`

负责：

- A2UI v0.9 MessageProcessor。
- DataModel、SurfaceModel、ComponentModel。
- Vue3 渲染入口。
- Basic Catalog 组件。
- action/error 派发。

### 4.3 Backend Agent

重点读取：

- `docs/backend/backend-implementation.md`
- `docs/backend/tasks.md`
- `docs/product/agent-platform-api.md`
- `docs/product/agent-platform-db-schema.md`

负责：

- Express API。
- Prisma schema 和 migrations。
- sessions/messages/files/skills/events/snapshots API。
- SSE。
- Agent run 编排。
- 导入导出。

### 4.4 Agent Runtime Agent

重点读取：

- `docs/agent/agent-runtime-implementation.md`
- `docs/agent/tasks.md`
- `docs/product/agent-platform-design.md`
- `docs/product/agent-platform-api.md`

负责：

- AgentRuntime。
- AgentContextBuilder。
- PromptComposer。
- ModelClient。
- validateA2UI。
- 生成-校验-修复循环。

### 4.5 Integration Agent

重点读取：

- `docs/product/tasks/integration-tasks.md`
- 所有模块 `tasks.md`
- `docs/product/agent-platform-api.md`

负责：

- Mock A2UI 端到端链路。
- 真实 Agent 成功链路。
- 真实 Agent 失败链路。
- 文件进入 Agent 上下文。
- skill 进入 Agent 上下文。
- Renderer action 回传。

## 5. 推荐开发顺序

### 阶段 0：工程骨架

目标：

- 建立 `packages` monorepo。
- 建立 TypeScript 配置。
- 建立 Vitest 配置。
- 建立共享类型包。

建议优先创建：

```text
packages/shared
packages/renderer
packages/backend
packages/agent
packages/frontend
```

### 阶段 1：共享类型

目标：

- 定义 Session、Message、AgentRun、A2UIEvent、SurfaceSnapshot。
- 定义 SSE event 类型。
- 定义 Agent result 类型。
- 定义 A2UI v0.9 基础消息类型。

当前工程已创建 `packages/shared` 骨架，后续任务是在该包内完善类型、必要常量和纯函数。它是并行开发的同步点，应优先完成，并作为 `frontend`、`renderer`、`backend`、`agent` 的共享契约源。

### 阶段 2：Renderer 最小闭环

目标：

- DataModel。
- SurfaceModel。
- MessageProcessor。
- Text/Row/Column/Button/TextField。
- 本地 mock A2UI messages 可渲染。

### 阶段 3：Backend Mock 链路

目标：

- Express 基础 API。
- Prisma schema。
- sessions/messages/agent_runs/a2ui_events/surface_snapshots。
- SSE。
- mock Agent 成功返回固定 A2UI messages。

### 阶段 4：Frontend 工作台

目标：

- 左侧 tab + 右侧功能区。
- 会话列表。
- 对话发送。
- SSE 接入。
- Renderer 预览接入。

### 阶段 5：Agent Runtime

目标：

- ModelClient。
- PromptComposer。
- ContextBuilder。
- validateA2UI。
- 三次修复循环。

### 阶段 6：真实端到端

目标：

- 用户输入。
- Agent 生成。
- validateA2UI 校验。
- backend commit。
- SSE 推送。
- Renderer 渲染。

## 6. 首个里程碑

首个里程碑建议是：

```text
TASK-INT-002：Mock A2UI 端到端链路
```

验收标准：

- 用户可以创建会话。
- 用户可以发送消息。
- 后端生成 mock A2UI event。
- 后端通过 SSE 推送 `assistant_message` 和 `a2ui_messages`。
- 前端收到 A2UI messages。
- Renderer 渲染一个最小 UI。

这个里程碑不依赖真实模型，因此能尽快验证四个模块边界。

## 7. 已确认工程选型

### 7.1 Monorepo 包管理器

使用：`pnpm workspace`。

### 7.2 前端状态管理

使用：Pinia。

约束：Renderer 内部状态不要混入 Pinia，保持独立模型。

### 7.3 前端路由

使用：Vue Router。

### 7.4 UI 组件库

使用：Naive UI。

### 7.5 CSS 方案

待确认：

- 普通 CSS / CSS Modules
- Tailwind CSS
- UnoCSS

建议：Renderer 的 Basic Catalog 样式应独立封装，避免被工作台样式污染。

### 7.6 后端校验库

使用：

- API DTO 校验：Zod。
- A2UI JSON Schema 校验：Ajv。

### 7.7 日志库

使用：pino。

### 7.8 Express 中间件

使用：

- multipart 上传中间件：multer。

仍需定义：

- CORS 策略。
- JSON body size 必须限制。

### 7.9 Prisma 迁移策略

使用：Prisma migrate + 必要 SQL migration。

### 7.10 端到端测试工具

待确认：

- Playwright
- 只用 Vitest + component tests

建议：核心端到端链路后续使用 Playwright；MVP 初期可以先用 Vitest 覆盖服务和 Renderer。

### 7.11 环境变量管理

待确认：

- dotenv
- Vite env
- 单独配置模块

建议：

- 后端和 Agent 使用 dotenv。
- 前端只暴露 `VITE_` 前缀变量。
- OpenAI-compatible API key 只存在后端/Agent 环境变量中。

## 8. 开工原则

- 先 mock，后真实模型。
- 先最小闭环，后补齐组件。
- 先共享类型，后并行模块。
- 先提交合法 A2UI event，再推送 Renderer。
- 所有项目文档使用中文。
- 不在任务中引入产品文档未定义的新功能。

## 9. 本地开发数据库

后端使用 PostgreSQL，不提供内存数据库或 SQLite 兜底。根目录 `.env.example` 中的默认连接串为：

```text
postgresql://postgres:postgres@localhost:5432/a2ui_agent_platform?schema=public
```

本地开发推荐安装 Docker Desktop。根目录提供 `docker-compose.yml`，`pnpm dev` 会先执行 `scripts/ensure-dev-db.mjs`：

- 如果 `.env` 中的 `DATABASE_URL` 已可连接，则直接复用现有数据库。
- 如果不可连接，则尝试执行 `docker compose up -d postgres` 启动本地 PostgreSQL。
- 数据库就绪后自动执行 Prisma Client 生成和 `prisma db push`，再启动前端与后端开发服务。

如果不使用 Docker，需要手动启动 PostgreSQL，并确保 `.env` 中 `DATABASE_URL` 指向可连接的数据库。
