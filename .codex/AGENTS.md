# AGENTS.md

## 1. 项目定位

本项目是全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端编排 Agent Runtime 生成 A2UI v0.9 消息；消息经 `validateA2UI` 校验通过后提交，前端 Vue3 Renderer 渲染为可交互 UI。

所有面向用户的说明、项目文档、代码注释、错误消息和日志默认使用中文；代码标识符、类型名、命令、协议字段和文件路径保留英文原文。

## 2. 工作流入口

本仓库采用 Matt-first 工作系统，优先使用 `cyz-*` skills：

- `cyz-grill-with-docs`：澄清想法，并按需维护 glossary / ADR。
- `cyz-to-spec`：把已澄清的讨论发布为 `docs/matt_docs/scratch/<feature-slug>/spec.md`。
- `cyz-to-tickets`：把 spec 或计划拆成 blocker-first tickets。
- `cyz-domain-modeling`：维护 `docs/matt_docs/CONTEXT.md` 和 `docs/matt_docs/adr/`。
- `cyz-handoff`：按 Matt 原版行为写临时 handoff，不写入仓库。

不要使用旧的 `docs/00-governance/`、`docs/50-delivery/`、根目录 `.scratch/` 或根目录 `CONTEXT.md`。

## 3. 必读文档

开始任务前按需阅读：

- `docs/matt_docs/README.md`：Matt-first 工作系统入口。
- `docs/matt_docs/agents/issue-tracker.md`：本地 issue tracker 规则。
- `docs/matt_docs/agents/domain.md`：domain docs 消费规则。
- `docs/matt_docs/CONTEXT.md`：领域词汇表，只作为 glossary。
- `docs/10-product/`：产品需求、路线图和能力范围。
- `docs/20-design/module-boundaries.md`：模块功能、定位和边界。
- `docs/30-contracts/`：API、DB、A2UI、Shared Types 等跨模块契约。
- `docs/40-implementation/modules/<module>/README.md`：当前源码真实实现。

`docs/90-notes/` 只保存历史、调研和阅读辅助材料，不作为当前实现、契约或验收依据。

## 4. 文档写入规则

- Agent 任务推进、spec、issues、blocking edges 和验收标准写入 `docs/matt_docs/scratch/<feature-slug>/`。
- 领域词汇只写入 `docs/matt_docs/CONTEXT.md`，不要把它当作 spec、草稿或实现说明。
- 新 ADR 只写入 `docs/matt_docs/adr/`，采用 Matt 轻量格式。
- 产品能力、用户场景、非目标或路线图变化写入 `docs/10-product/`。
- 模块长期功能、定位和边界变化写入 `docs/20-design/module-boundaries.md`。
- API、DB、A2UI、Shared Types 等跨模块数据变化写入 `docs/30-contracts/`。
- 当前代码结构、入口、运行链路、状态模型和测试方式变化写入 `docs/40-implementation/`。
- 历史材料、调研和学习笔记写入 `docs/90-notes/`。

任务完成前，必须把 `docs/matt_docs/scratch/` 中产生的稳定事实回填到对应长期文档。

## 5. 任务关闭检查

完成代码或文档任务前检查：

1. 是否运行了相关测试；如果没有，说明原因。
2. 是否检查了 `git status --short`。
3. 跨模块契约变化是否同步到 `docs/30-contracts/`。
4. 当前实现变化是否同步到 `docs/40-implementation/`。
5. 产品或模块边界变化是否同步到 `docs/10-product/` 或 `docs/20-design/module-boundaries.md`。
6. 如果存在相关 Matt issue，是否更新其状态、结果或遗留问题。
7. 重要用户可见、契约、架构或文档系统变化是否更新 `docs/CHANGELOG.md`。

## 6. 项目结构

```text
packages/
  shared/     # 共享类型、DTO、A2UI message、SSE event、Agent result
  renderer/   # Vue3 A2UI Renderer
  frontend/   # 平台工作台
  backend/    # Express API、Prisma、SSE、文件和业务编排
  agent/      # Agent Runtime、Prompt、ModelClient、validateA2UI
```

不要优先修改生成物、依赖目录或运行期上传文件：

- `node_modules/`
- `.pnpm-store/`
- `packages/*/dist/`
- `packages/*/node_modules/`
- `packages/backend/uploads/`
- `tmp-dev-*.log`

## 7. 开发原则

- 先共享类型，后模块实现；跨模块契约优先放入 `packages/shared` 和 `docs/30-contracts/`。
- 后端只提交通过 `validateA2UI` 的 A2UI 消息。
- Renderer 不接收未通过后端校验的消息作为正式状态。
- Renderer 内部状态不得放入 Pinia。
- `packages/renderer` 不得依赖 `packages/backend`。
- Agent 不得读取任意本地路径，不得直接写数据库，不得开放 HTTP API。
- 不得把 API key 写入数据库或前端环境变量。
- 不得把未通过校验的 A2UI 草稿写入 `a2ui_events`。

## 8. 命令约定

依赖安装后可使用：

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

如果命令不可用，应说明原因，不要假装已验证。
