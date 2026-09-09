# Vue A2UI Agent Platform

Vue A2UI Agent Platform 是一个用于探索 Agent 驱动 UI 生成与渲染的 monorepo。项目围绕 A2UI 协议组织前端工作台、后端工作流服务、Agent Runtime、Vue Renderer 和共享契约类型，支持从用户需求到 Agent 规划、A2UI 生成、校验、预览和提交的完整链路。

## 项目能力

- 基于 Vue 3 的前端工作台，提供会话、工作流、技能、预览和导入导出等操作界面。
- 基于 Express + Prisma + PostgreSQL 的后端服务，负责会话、消息、工作流、Agent Run、文件、快照和 SSE 实时同步。
- Agent Runtime 封装 ReAct 风格执行循环、受控工具、技能上下文、资源账本和 A2UI 校验。
- Vue A2UI Renderer 将 A2UI JSON 渲染为可交互界面，并提供独立 Renderer Lab 方便验证组件能力。
- `packages/shared` 统一维护 API DTO、SSE 事件、Agent 类型、Resource Ledger 和 A2UI 协议类型。

## 技术栈

- 包管理：pnpm workspace
- 前端：Vue 3、Vite、Pinia、Vue Router、Naive UI
- 后端：Node.js、Express、Prisma、PostgreSQL
- Agent / Renderer：TypeScript、Zod、AJV、SES、Acorn
- 测试：Vitest、jsdom、vue-tsc、tsc

## 目录结构

```text
.
├── docs/                  # 产品、设计、契约和当前实现文档
├── packages/
│   ├── agent/             # Agent Runtime、技能注册、A2UI 生成与校验逻辑
│   ├── backend/           # Express API、Prisma 数据访问、工作流服务和 SSE
│   ├── frontend/          # Vue 前端工作台
│   ├── renderer/          # A2UI Vue Renderer 与 Renderer Lab
│   └── shared/            # 跨包共享类型、契约和工具
├── scripts/               # 本地开发环境准备脚本
├── docker-compose.yml     # 本地 PostgreSQL
├── package.json           # 根工作区脚本
└── pnpm-workspace.yaml    # pnpm workspace 配置
```

## 环境要求

- Node.js 22 或更高版本
- pnpm 9
- Docker Desktop，或一个可连接的 PostgreSQL 16 实例

首次运行前，在项目根目录创建 `.env`：

```bash
cp .env.example .env
```

常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3100` | 后端 HTTP 服务端口 |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/a2ui_agent_platform?schema=public` | PostgreSQL 连接串 |
| `OPENAI_COMPAT_BASE_URL` | `https://api.openai.com/v1` | OpenAI 兼容模型 API 地址 |
| `OPENAI_COMPAT_API_KEY` | 空 | 模型 API Key |
| `OPENAI_COMPAT_MODEL` | `gpt-4.1` | Agent 使用的模型名 |
| `VITE_API_BASE_URL` | `http://localhost:3100` | 前端代理到的后端地址 |
| `VITE_PORT` | `5173` | 前端开发服务端口 |
| `LOG_LEVEL` | `info` | 服务日志级别 |
| `MODEL_IO_LOG` | `off` | 是否启用模型输入输出日志 |

## 快速开始

安装依赖、准备数据库并启动前后端：

```bash
pnpm setup
```

`pnpm setup` 会执行以下步骤：

1. 安装 workspace 依赖。
2. 构建 `@a2ui-platform/shared`。
3. 检查 PostgreSQL 连接；如果默认数据库不可连接，会尝试通过 `docker compose up -d postgres` 启动本地数据库。
4. 生成 Prisma Client 并同步数据库结构。
5. 并行启动前端和后端开发服务。

启动完成后访问：

```text
http://localhost:5173
```

如果只想启动开发服务，并让脚本自动清理旧的 `3100` / `5173` 端口进程和准备数据库：

```bash
pnpm dev
```

如果数据库已经准备好，只启动应用：

```bash
pnpm dev:app
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 准备数据库并并行启动前端、后端 |
| `pnpm dev:app` | 并行启动前端、后端，不额外执行准备脚本 |
| `pnpm dev:frontend` | 仅启动前端 |
| `pnpm dev:backend` | 仅启动后端 |
| `pnpm build` | 构建所有 workspace 包 |
| `pnpm test` | 运行所有包的测试 |
| `pnpm typecheck` | 运行所有包的类型检查 |
| `pnpm lint` | 运行所有包的 lint/typecheck 脚本 |
| `pnpm format` | 使用 Prettier 格式化项目 |
| `pnpm repair:snapshots` | 修复后端当前快照数据 |
| `pnpm skill:sync` | 同步内置技能到后端 |
| `pnpm skill:docs` | 生成平台技能文档 |

## 数据库

本地默认使用 `docker-compose.yml` 中的 PostgreSQL：

```bash
docker compose up -d postgres
```

数据库准备脚本会自动执行：

```bash
node --env-file=.env scripts/ensure-dev-db.mjs
```

如果需要手动操作 Prisma，可使用后端包脚本：

```bash
pnpm --filter @a2ui-platform/backend prisma:generate
pnpm --filter @a2ui-platform/backend prisma:push
pnpm --filter @a2ui-platform/backend prisma:migrate
```

## Renderer Lab

Renderer Lab 用于专门展示和验证 `packages/renderer` 的渲染能力，包括投票卡片、课程卡片、音乐播放器、Todo List、黑金金融资讯卡片、商品卡片和数据看板等 A2UI 示例。

在项目根目录运行：

```bash
pnpm --filter @a2ui-platform/renderer demo
```

启动后打开终端中显示的本地地址，通常是：

```text
http://127.0.0.1:5173
```

如果端口被占用，Vite 会自动切换到其他端口，请以终端输出为准。

## 测试与质量检查

提交代码前建议至少运行：

```bash
pnpm typecheck
pnpm test
```

涉及构建产物或跨包导出时，再运行：

```bash
pnpm build
```

## 文档索引

- [产品文档](./docs/10-product/README.md)
- [设计文档](./docs/20-design/README.md)
- [契约文档](./docs/30-contracts/README.md)
- [当前实现](./docs/40-implementation/README.md)
- [项目笔记与归档](./docs/90-notes/README.md)

文档维护约定：

- 产品目标、范围和优先级更新到 `docs/10-product/`。
- 模块职责、边界和长期设计更新到 `docs/20-design/`。
- API、数据库、共享类型和 A2UI 协议更新到 `docs/30-contracts/`。
- 已落地的源码事实更新到 `docs/40-implementation/`。

## 开发提示

- 根脚本优先使用 workspace filter 调用各包命令，新增包脚本时保持同样风格。
- 跨包类型或协议变化应先同步 `packages/shared` 和 `docs/30-contracts/`。
- 前端、后端、Agent、Renderer 的模块边界以 `docs/20-design/` 为准；当前源码事实以 `docs/40-implementation/` 为准。
- Renderer 组件能力变化时，同步更新 Renderer Lab 示例，方便人工和自动化验证。
