# AGENTS.md

## 1. 项目定位

本项目是一个全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端 Agent Runtime 生成 A2UI v0.9 消息，经 `validateA2UI` 校验通过后提交，前端 Vue3 Renderer 渲染 UI。

所有项目文档、代码注释、错误消息和日志输出默认使用中文。

## 2. 必读文档

开始任务前按需阅读：

- `docs/README.md`：文档入口与真相源规则。
- `docs/00-governance/`：文档分类、维护规则、阅读路径和写作规则。
- `docs/10-product/`：产品需求、路线图和能力范围。
- `docs/20-design/`：项目概览、系统设计、模块目标设计和架构决策。
- `docs/30-contracts/`：API、DB、A2UI、SSE、Shared Types 等跨模块契约。
- `docs/40-implementation/`：当前源码真实实现镜像。
- `docs/50-delivery/planning/current.md`：当前活跃交付任务索引。
- `docs/50-delivery/operations/development.md`：开发命令、工程结构和通用约定。

`docs/90-notes/` 默认保存 AI/人工阅读辅助材料和历史归档，不作为当前实现、契约或验收依据。

## 3. 文档治理规则

项目文档按用途分层维护：

- `docs/00-governance/`：文档系统治理真相源。
- `docs/10-product/`：产品真相源。可以描述未来能力，但必须标注状态。
- `docs/20-design/`：设计真相源。可以描述目标架构，但必须标注实现状态。
- `docs/30-contracts/`：跨模块数据交互最高真相源。API、DB、事件、A2UI、Shared Types 以这里为准。
- `docs/40-implementation/`：当前真实实现真相源。必须严格基于源码，不写推测或未落地能力。
- `docs/50-delivery/`：功能新增、功能修改、重构、修复的任务期工作区。
- `docs/90-notes/`：学习、解释、调研、AI 生成辅助材料和历史归档，不作为开发或验收依据。

修改代码时：

- 改变真实实现，必须同步 `docs/40-implementation/`。
- 改变跨模块字段、接口、事件、消息或数据结构，必须同步 `docs/30-contracts/`。
- 改变长期产品目标或用户能力，才同步 `docs/10-product/`。
- 改变长期架构或模块目标职责，才同步 `docs/20-design/`。
- 较大的功能新增、功能修改、重构或修复，应在 `docs/50-delivery/planning/` 下创建或更新任务目录。
- 不以 `docs/90-notes/` 判断当前行为。

## 4. 项目结构

```text
packages/
  shared/     # 共享类型、DTO、A2UI message、SSE event、Agent result
  renderer/   # Vue3 A2UI Renderer
  frontend/   # 平台工作台
  backend/    # Express API、Prisma、SSE、文件和业务编排
  agent/      # Agent Runtime、Prompt、ModelClient、validateA2UI
```

不要优先修改生成物或依赖目录：

- `node_modules/`
- `.pnpm-store/`
- `packages/*/dist/`
- `packages/*/node_modules/`
- `packages/backend/uploads/`
- `tmp-dev-*.log`

## 5. 开发原则

- 先共享类型，后模块实现；跨模块契约优先放入 `packages/shared` 和 `docs/30-contracts/`。
- 后端只提交通过 `validateA2UI` 的 A2UI 消息。
- Renderer 不接收未通过后端校验的消息作为正式状态。
- Renderer 内部状态不得放入 Pinia。
- `packages/renderer` 不得依赖 `packages/backend`。
- Agent 不得读取任意本地路径，不得直接写数据库，不得开放 HTTP API。
- 不得把 API key 写入数据库或前端环境变量。
- 不得把未通过校验的 A2UI 草稿写入 `a2ui_events`。

## 6. 命令约定

依赖安装后可使用：

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

当前环境可能尚未安装 pnpm 或依赖；如果命令不可用，应说明原因，不要假装已验证。

## 7. 代码规范

- 使用 TypeScript。
- 优先复用 `packages/shared` 类型。
- API 请求/响应遵守 `docs/30-contracts/api.md`。
- Prisma schema 遵守 `docs/30-contracts/db-schema.md`。
- A2UI 协议遵守 `docs/30-contracts/a2ui-v0.9.md`。
- API DTO 校验使用 Zod。
- A2UI JSON Schema 校验使用 Ajv。
- 后端日志使用 pino，避免散落 `console.log`。
- 文件上传使用 multer。

### 文档同步

当注释对应的 API、DB、A2UI、Shared Types、模块职责或产品能力发生变化时，必须同步更新 `docs/30-contracts/`、`docs/40-implementation/`、`docs/10-product/`、`docs/20-design/` 或 `docs/CHANGELOG.md` 中的相关内容。
