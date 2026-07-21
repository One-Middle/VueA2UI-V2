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

### 基本原则

代码注释用于帮助开发者和 AI Agent 理解代码背后的设计意图、业务约束和维护边界，而不是重复代码字面含义。

必须遵守：

- 使用中文书写，专有名词、协议字段、类型名和命令可保留英文。
- 与当前实现保持一致；代码行为变化时，必须同步更新或删除相关注释。
- 优先解释「为什么这样做」「不能破坏什么约束」「修改会影响哪里」。

禁止添加：

- 重复代码本身含义的注释，例如 `// 设置 name`。
- 无意义的变量解释，例如 `// 用户 ID 变量`。
- 与当前实现不一致的过时注释。
- 将密钥、Token、隐私数据、真实用户数据写入注释。

### 文件头注释

每个业务代码文件、核心模块文件应在 import 前包含中文文件头注释，说明：

- 当前文件或模块的核心职责。
- 明确不负责的内容。
- 重要依赖、契约、边界限制或修改注意事项。

文件头注释模板：

```ts
/**
 * <模块概述：说明该文件主要功能>
 *
 * 职责：
 * - <职责 1>
 * - <职责 2>
 *
 * 不负责：
 * - <明确不属于本模块的内容>
 *
 * 注意：
 * - <重要依赖、边界限制或修改注意事项>
 */
```

当某一项确实不存在时，可以省略对应小节，但不得保留空模板。

以下文件可不强制添加文件头注释：

- 纯样式文件、静态资源、测试夹具、简单配置文件。
- `index.ts` 这类仅做 re-export 的聚合文件。
- 自动生成文件、构建产物和第三方代码。

### 接口与业务注释

以下内容应添加必要的中文 JSDoc 或块级注释：

- 跨包、跨模块复用的导出类型、函数、类、组件和服务方法。
- API、DB、A2UI、SSE、Agent 结果等契约定义。
- 参数、返回值、副作用或异常行为不直观的公共接口。
- 复杂业务流程、兼容逻辑、兜底逻辑、事务、SSE、文件上传、模型调用等容易误改的代码。

示例：

```ts
/**
 * 校验并提交一条正式 A2UI 消息。
 *
 * 注意：
 * - 只允许提交通过 validateA2UI 的消息。
 * - 不负责生成 A2UI 内容，生成逻辑由 Agent Runtime 完成。
 */
export async function commitA2UIMessage(input: CommitA2UIInput): Promise<CommitA2UIResult> {
  // ...
}
```

### TODO 与临时注释

允许使用 `TODO`、`FIXME`、`NOTE`、`WARN`，但必须写清楚原因和后续动作。

格式：

```ts
// TODO(<负责人或模块>): <需要完成的动作>，原因：<为什么暂时不能完成>。
// FIXME(<负责人或模块>): <需要修复的问题>，影响：<当前风险或影响范围>。
// NOTE(<模块>): <重要背景或约束>。
// WARN(<模块>): <容易破坏的边界或风险>。
```

### 文档同步

当注释对应的 API、DB、A2UI、shared 类型、模块职责或产品能力发生变化时，必须同步更新 `docs/03-contracts/`、`docs/04-modules/`、`docs/01-product/prd.md` 或 `docs/CHANGELOG.md` 中的相关内容。
