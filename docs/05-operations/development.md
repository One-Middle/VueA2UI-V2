# 开发说明

## 1. 技术栈

- Monorepo：pnpm workspace，包目录为 `packages/*`
- 前端：Vue 3、Vite、Vue Router、Pinia、Naive UI
- Renderer：Vue 3、A2UI v0.9
- 后端：Node.js、Express、Prisma、PostgreSQL
- Agent：Node.js、TypeScript、OpenAI-compatible API
- 校验：Zod、Ajv
- 日志与上传：pino、multer
- 测试：Vitest

## 2. 仓库结构

```text
.
  docs/                    # 当前项目文档
  packages/
    shared/                # 跨模块共享类型
    renderer/              # Vue3 A2UI Renderer
    frontend/              # 平台工作台
    backend/               # Express API 与业务编排
    agent/                 # Agent Runtime 与 A2UI 校验
  scripts/                 # 本地开发辅助脚本
  docker-compose.yml       # 可选 PostgreSQL 容器配置
  package.json             # 根脚本入口
  pnpm-workspace.yaml      # workspace 配置
  tsconfig.base.json       # TypeScript 基础配置
  vitest.workspace.ts      # Vitest workspace 配置
  .env.example             # 环境变量示例
  AGENTS.md                # AI 协作与项目约束
```

## 3. 常用命令

依赖安装后可使用：

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

单模块命令：

```bash
pnpm dev:frontend
pnpm dev:backend
pnpm --filter @a2ui-platform/renderer test
pnpm --filter @a2ui-platform/agent typecheck
pnpm --filter @a2ui-platform/backend skill:docs
```

`pnpm --filter @a2ui-platform/backend skill:docs` 会从数据库读取当前 Skill，并同步到 `packages/backend/skill-docs/`。该目录是开发期可读镜像，数据库仍是事实来源，不支持从文档反向导入。

当前环境可能尚未安装 pnpm 或依赖；如果命令不可用，应说明原因，不要假装已验证。

## 4. 开发原则

- 先共享类型，后模块实现；跨模块契约优先放入 `packages/shared`。
- 后端只提交通过 `validateA2UI` 的 A2UI 消息。
- Renderer 不接收未通过后端校验的消息作为正式状态。
- 修改模块功能逻辑时，同步更新 `docs/04-modules/<module>/README.md`。
- 修改 API、DB、A2UI、shared 类型时，同步更新 `docs/03-contracts/`。
- 设计功能逻辑变更时，同步更新 `docs/CHANGELOG.md`。

## 5. 不优先修改的目录

以下目录通常是生成物或依赖目录，不要优先手工修改：

- `node_modules/`
- `.pnpm-store/`
- `packages/*/dist/`
- `packages/*/node_modules/`
- `packages/backend/uploads/`
- `tmp-dev-*.log`

## 6. 模块入口

- Frontend：[../04-modules/frontend/README.md](../04-modules/frontend/README.md)
- Renderer：[../04-modules/renderer/README.md](../04-modules/renderer/README.md)
- Backend：[../04-modules/backend/README.md](../04-modules/backend/README.md)
- Agent：[../04-modules/agent/README.md](../04-modules/agent/README.md)
- Shared：[../04-modules/shared/README.md](../04-modules/shared/README.md)
