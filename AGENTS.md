# AGENTS.md

## 1. 项目定位

本项目是一个全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端 Agent Runtime 生成 A2UI v0.9 消息，经 `validateA2UI` 校验通过后提交，前端 Vue3 Renderer 渲染 UI。

所有项目文档、代码注释、错误消息和日志输出默认使用中文。

## 2. 必读文档

开始任务前按需阅读：

- `docs/README.md`：文档入口与权威来源规则。
- `docs/00-meta/`：文档分类、维护规则和阅读路径。
- `docs/02-architecture/overview.md`：项目概览和 MVP 边界。
- `docs/05-operations/development.md`：开发命令、工程结构和通用约定。
- `docs/02-architecture/system-design.md`：系统架构、模块边界和端到端链路。
- `docs/03-contracts/`：API、DB、A2UI、shared 类型契约。
- `docs/04-modules/`：各模块功能定位、关键类、核心链路和文件职责。
- `docs/06-planning/current.md`：当前活跃平台改造计划索引。

`docs/90-notes/` 默认保存 AI/人工阅读辅助材料，不作为权威事实来源。`docs/99-archive/` 仅为历史归档，不作为当前实现契约。

## 3. 项目结构

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

## 4. 开发原则

- 先共享类型，后模块实现；跨模块契约优先放入 `packages/shared`。
- 后端只提交通过 `validateA2UI` 的 A2UI 消息。
- Renderer 不接收未通过后端校验的消息作为正式状态。
- Renderer 内部状态不得放入 Pinia。
- `packages/renderer` 不得依赖 `packages/backend`。
- Agent 不得读取任意本地路径，不得直接写数据库，不得开放 HTTP API。
- 不得把 API key 写入数据库或前端环境变量。
- 不得把未通过校验的 A2UI 草稿写入 `a2ui_events`。

## 5. 文档维护

- 新增或修改产品能力：更新 `docs/01-product/prd.md`、相关架构/契约/模块文档和 `docs/CHANGELOG.md`。
- 修改 API、DB、A2UI 或 shared 类型：更新 `docs/03-contracts/` 对应文档。
- 修改模块功能逻辑或代码结构：更新 `docs/04-modules/` 对应文档，并维护关键类或核心链路说明。
- 较大的平台改造：在 `docs/06-planning/` 下创建独立计划目录，`current.md` 只维护活跃计划索引。
- AI 生成的阅读辅助材料默认放入 `docs/90-notes/`，不要直接作为权威契约。

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
- API 请求/响应遵守 `docs/03-contracts/api.md`。
- Prisma schema 遵守 `docs/03-contracts/db-schema.md`。
- A2UI 协议遵守 `docs/03-contracts/a2ui-v0.9.md`。
- API DTO 校验使用 Zod。
- A2UI JSON Schema 校验使用 Ajv。
- 后端日志使用 pino，避免散落 `console.log`。
- 文件上传使用 multer。

## 8. 注释规范

- 每个代码文件顶部应包含中文文件头注释，说明模块核心职责。
- 所有 `export` 函数、类公共方法、接口和类型定义应使用中文 JSDoc。
- 复杂逻辑可使用 `// 1. ...`、`// 2. ...` 形式拆分步骤。
- 大型文件可使用 `// --- 类型定义 ---`、`// --- 公共 API ---` 等分隔线组织内容。

文件头注释模板：

```ts
/**
 * <一句话概述：这个模块是做什么的>
 *
 * 职责：
 * - <职责 1>
 * - <职责 2>
 *
 * 不负责：<明确不属于本模块的边界>
 */
```
