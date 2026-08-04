# 项目结构说明

本文档说明 A2UI Agent 平台的工程目录结构、源码模块划分和关键文件用途。它侧重“代码在哪里、职责是什么、开发时从哪里进入”，与 [项目主要功能结构](./project-feature-structure.md) 互补。

## 1. 仓库总览

```text
.
├─ docs/                    # 项目文档
├─ packages/                # pnpm workspace 源码包
│  ├─ shared/               # 跨模块共享类型
│  ├─ renderer/             # Vue3 A2UI Renderer
│  ├─ frontend/             # 平台前端工作台
│  ├─ backend/              # Express API 与业务编排
│  └─ agent/                # Agent Runtime 与 A2UI 校验
├─ scripts/                 # 本地开发辅助脚本
├─ docker-compose.yml       # 可选的本地 PostgreSQL 容器配置
├─ package.json             # 根脚本与工作区命令入口
├─ pnpm-workspace.yaml      # pnpm workspace 配置
├─ tsconfig.base.json       # TypeScript 基础配置
├─ vitest.workspace.ts      # Vitest workspace 配置
├─ .env.example             # 环境变量示例
└─ AGENTS.md                # AI 协作与项目约束
```

## 2. 根目录文件

### 2.1 包管理与脚本

- `package.json`：根项目脚本入口，包含 `dev`、`build`、`test`、`typecheck`、`lint` 等命令。
- `pnpm-workspace.yaml`：声明 `packages/*` 为 workspace 包。
- `pnpm-lock.yaml`：锁定依赖版本。

### 2.2 TypeScript 与测试

- `tsconfig.base.json`：各 package 共享的 TypeScript 基础配置。
- `vitest.workspace.ts`：多包 Vitest 配置入口。

### 2.3 环境与服务

- `.env`：本地实际环境变量，包含数据库、端口和模型配置。不要提交敏感值。
- `.env.example`：环境变量示例，供新环境复制。
- `docker-compose.yml`：本地 PostgreSQL 备用启动方式。

### 2.4 AI 协作约束

- `AGENTS.md`：项目技术栈、模块边界、开发原则和禁止事项。
- `CLAUDE.md`：其他 AI 工具相关上下文。

## 3. packages 结构

项目采用 pnpm monorepo。所有业务源码位于 `packages/`。

```text
packages/
├─ shared/
├─ renderer/
├─ frontend/
├─ backend/
└─ agent/
```

模块依赖方向：

```text
shared
  ↑
  ├─ renderer
  ├─ agent
  ├─ backend
  └─ frontend

frontend -> renderer
backend  -> agent
```

约束：

- `shared` 不依赖业务模块。
- `renderer` 不依赖 `backend`。
- `agent` 不直接写数据库。
- `frontend` 不直接调用模型，不直接访问数据库。
- 跨模块 DTO 和协议类型优先放入 `shared`。

## 4. packages/shared

定位：跨模块共享类型契约。

```text
packages/shared/
├─ src/
│  ├─ a2ui.ts              # A2UI v0.9 message、component、surface 类型
│  ├─ agent.ts             # Agent input、result、validation、tool call 类型
│  ├─ api.ts               # API request/response DTO 类型
│  ├─ sse.ts               # SSE event 类型
│  └─ index.ts             # 统一导出
├─ package.json
└─ tsconfig.json
```

开发入口：

- 修改 API DTO：先改 `src/api.ts`。
- 修改 A2UI 协议类型：先改 `src/a2ui.ts`。
- 修改 SSE 事件：先改 `src/sse.ts`。
- 修改 Agent 契约：先改 `src/agent.ts`。

## 5. packages/renderer

定位：Vue3 A2UI v0.9 Renderer，负责消费合法 A2UI 消息并渲染 UI。

```text
packages/renderer/
├─ src/
│  ├─ core/                # Renderer 状态模型与消息处理
│  ├─ components/          # Basic Catalog 组件实现
│  │  └─ basic/
│  ├─ vue/                 # Vue 渲染入口组件与上下文
│  ├─ catalog-registry.ts  # Catalog 组件注册
│  ├─ index.ts             # 包导出入口
│  └─ styles.css
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

关键文件：

- `src/core/message-processor.ts`：处理 `createSurface`、`updateComponents`、`updateDataModel`、`deleteSurface`。
- `src/core/surface-model.ts`：维护 surface、components、data model、theme。
- `src/core/data-model.ts`：JSON Pointer 数据读写。
- `src/core/component-context.ts`：组件渲染上下文。
- `src/vue/A2uiSurface.vue`：Surface 渲染入口。
- `src/vue/A2uiComponent.vue`：递归渲染组件。
- `src/components/basic/*`：Basic Catalog 组件。

开发入口：

- 新增基础组件：优先在 `src/components/basic/` 添加，并更新 `src/catalog-registry.ts`。
- 修改消息处理：查看 `src/core/message-processor.ts`。
- 修改数据绑定：查看 `src/core/data-model.ts` 和 `src/core/data-context.ts`。

## 6. packages/frontend

定位：平台工作台前端，负责页面、状态、API/SSE 接入和 Renderer 集成。

```text
packages/frontend/
├─ src/
│  ├─ features/            # 按功能域组织的面板
│  │  ├─ conversation/
│  │  ├─ preview/
│  │  ├─ history/
│  │  ├─ skills/
│  │  ├─ import-export/
│  │  └─ runtime/
│  ├─ services/            # HTTP API 与 SSE 客户端
│  ├─ stores/              # Pinia 状态
│  ├─ views/               # 页面级视图
│  ├─ App.vue
│  ├─ main.ts
│  ├─ router.ts
│  └─ styles.css
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

关键文件：

- `src/views/WorkspacePage.vue`：工作台主布局。
- `src/features/conversation/ConversationPanel.vue`：对话页面。
- `src/features/conversation/MessageInput.vue`：消息输入框。
- `src/features/preview/PreviewPanel.vue`：A2UI 预览。
- `src/features/history/HistoryPanel.vue`：历史查看。
- `src/features/skills/SkillsPanel.vue`：Skills 管理。
- `src/features/import-export/ImportExportPanel.vue`：导入导出。
- `src/features/runtime/RuntimePanel.vue`：Runtime 调试信息。
- `src/services/api.ts`：HTTP API client。
- `src/services/stream.ts`：SSE client。
- `src/stores/workspace.ts`：工作台业务状态。
- `src/stores/renderer.ts`：Renderer 消息桥接状态。

开发入口：

- 改页面交互：优先看 `src/features/*`。
- 改 API 请求：看 `src/services/api.ts`。
- 改 SSE：看 `src/services/stream.ts`。
- 改全局工作台状态：看 `src/stores/workspace.ts`。

## 7. packages/backend

定位：Express API、Prisma、PostgreSQL、文件、SSE、Agent run 编排。

```text
packages/backend/
├─ prisma/
│  └─ schema.prisma        # 数据库模型
├─ src/
│  ├─ repositories/        # 数据访问层
│  ├─ routes/              # Express 路由
│  ├─ services/            # 业务服务层
│  ├─ utils/               # 错误、分页、校验工具
│  ├─ app.ts               # Express app 组装
│  ├─ config.ts            # 环境配置
│  ├─ db.ts                # Prisma Client
│  ├─ logger.ts            # pino 日志
│  └─ server.ts            # 服务启动入口
├─ uploads/                # 本地上传文件目录
├─ package.json
└─ tsconfig.json
```

关键文件：

- `src/server.ts`：启动服务、连接数据库、优雅退出。
- `src/app.ts`：注册中间件和 `/api` 路由。
- `src/config.ts`：读取 `PORT`、`DATABASE_URL`、模型配置等环境变量。
- `src/routes/*.ts`：HTTP API 路由定义。
- `src/services/*.ts`：业务编排，例如消息发送、Agent run、导出、snapshot。
- `src/repositories/*.ts`：Prisma 数据访问封装。
- `prisma/schema.prisma`：数据库 schema。

开发入口：

- 新增 API：先更新 `shared` DTO，再改 `routes`、`services`、`repositories`。
- 修改数据库：改 `prisma/schema.prisma`，同步更新 DB 文档和 DTO。
- 修改 Agent 触发流程：查看 `src/services/message.service.ts` 和 `src/services/agent-run.service.ts`。
- 修改 SSE：查看 `src/routes/stream.ts` 和 `src/services/stream.service.ts`。

## 8. packages/agent

定位：受控 Agent Runtime，负责上下文构建、prompt、模型调用、输出解析、A2UI 校验和修复循环。

```text
packages/agent/
├─ src/
│  ├─ context/             # Agent 上下文构建
│  ├─ model/               # OpenAI-compatible ModelClient
│  ├─ prompts/             # Prompt 组装
│  ├─ runtime/             # Agent Runtime 和输出解析
│  ├─ schemas/             # A2UI 与 Catalog JSON Schema
│  ├─ tools/               # validateA2UI 等受控工具
│  └─ index.ts             # 包导出入口
├─ package.json
└─ tsconfig.json
```

关键文件：

- `src/runtime/agent-runtime.ts`：Agent run 状态机和修复循环。
- `src/runtime/output-parser.ts`：模型输出解析。
- `src/context/context-builder.ts`：构建 Agent 上下文。
- `src/prompts/prompt-composer.ts`：生成初始 prompt 和 repair prompt。
- `src/model/model-client.ts`：调用 OpenAI-compatible API。
- `src/tools/validate-a2ui.ts`：A2UI 校验入口。
- `src/tools/catalog-schema.ts`：Basic Catalog 校验辅助。
- `src/schemas/*.json`：A2UI v0.9 与 Basic Catalog Schema。

开发入口：

- 修改模型调用：看 `src/model/model-client.ts`。
- 修改 prompt：看 `src/prompts/prompt-composer.ts`。
- 修改上下文内容：看 `src/context/context-builder.ts`。
- 修改校验逻辑：看 `src/tools/validate-a2ui.ts`。
- 修改修复循环：看 `src/runtime/agent-runtime.ts`。

## 9. scripts

```text
scripts/
├─ ensure-dev-db.mjs       # 检查 PostgreSQL、同步 Prisma Client 和 DB schema
└─ prepare-dev.mjs         # 开发启动前释放端口并准备数据库
```

用途：

- `ensure-dev-db.mjs`：用于确认本地 PostgreSQL 可用，并执行 Prisma 同步。
- `prepare-dev.mjs`：由 `pnpm dev` 调用，启动前清理开发端口并准备数据库。

## 10. docs

文档目录按主题组织：

```text
docs/
├─ README.md                         # 文档入口
├─ project-feature-structure.md      # 主要功能结构
├─ project-structure.md              # 项目结构说明
├─ product/                          # 产品、设计、API、DB、模块规格
├─ frontend/                         # 前端工作台和 Renderer 文档
├─ backend/                          # 后端文档
├─ agent/                            # Agent Runtime 文档
├─ renderer/                         # Renderer 细节文档
├─ shared/                           # 共享类型文档
└─ integration/                      # 集成链路文档
```

维护规则：

- 新增文档后，更新 `docs/README.md`。
- 产品能力变化时，同步产品、设计、模块和相关实现文档。
- API 或数据库变化时，同步 API/DB 文档和相关模块文档。

## 11. 生成物与依赖目录

以下目录通常不是手写源码，开发时不要优先修改：

- `node_modules/`：依赖安装目录。
- `.pnpm-store/`：pnpm 本地依赖存储。
- `packages/*/dist/`：构建输出。
- `packages/*/node_modules/`：workspace 包依赖链接。
- `packages/backend/uploads/`：本地上传文件存储。
- `tmp-dev-*.log`：开发调试日志。

如果需要修改源码，应优先修改对应 `src/`、`prisma/schema.prisma`、`scripts/` 或 `docs/` 下的文件。

## 12. 常用开发入口

### 启动项目

```bash
pnpm dev
```

启动前会执行开发准备脚本，检查数据库并清理开发端口。

### 类型检查

```bash
pnpm typecheck
```

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

## 13. 相关文档

- [文档入口](./README.md)
- [项目主要功能结构](./project-feature-structure.md)
- [模块实现规格](./product/agent-platform-module-specs.md)
- [Backend 模块实现说明](./backend/backend-implementation.md)
- [Frontend 模块实现说明](./frontend/frontend-implementation.md)
- [Agent Runtime 模块实现说明](./agent/agent-runtime-implementation.md)
- [Frontend Renderer 模块实现说明](./frontend/renderer/renderer-implementation.md)

