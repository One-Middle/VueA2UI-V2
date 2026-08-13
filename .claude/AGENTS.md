# AGENTS.md

## 1. 项目定位

本项目是全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端编排 Agent Runtime 生成 A2UI v0.9 消息；消息经 `validateA2UI` 校验通过后提交，前端 Vue3 Renderer 渲染为可交互 UI。

所有面向用户的说明、项目文档、代码注释、错误消息和日志默认使用中文；代码标识符、类型名、命令、协议字段和文件路径保留英文原文。

## 2. 文档仓库

`docs/` 是项目文档仓库，保存设计稿、工作流产物和解释材料。

本仓库文档分为三类：设计稿、工作流、解释材料。

### 设计稿

设计稿是开发依据。开发前应先阅读设计稿；如果实现需要改变设计稿，必须先与用户讨论并做出决定，然后再修改设计稿并开发。

- `docs/10-product/`：产品能力、用户场景、路线图、非目标。
- `docs/20-design/module-boundaries.md`：模块功能、定位、负责范围、不负责范围和交互边界。
- `docs/30-contracts/`：API、DB、A2UI、Shared Types 等跨模块契约。

### 工作流

工作流用于 Agent 推进任务，不替代设计稿和代码实现。

- `docs/matt_docs/README.md`：Matt-first 工作系统入口。
- `docs/matt_docs/CONTEXT.md`：领域词汇表，只作为 glossary。
- `docs/matt_docs/adr/`：Matt 风格 ADR。
- `docs/matt_docs/scratch/<feature-slug>/`：spec、issues、blocking edges 和验收标准。
- `docs/matt_docs/agents/`：issue tracker、domain docs 和 triage labels 配置。

### 解释材料

解释材料用于帮助开发者理解当前代码。它不是 Agent 判断当前实现的第一依据；代码才是当前实现的真实来源。

- `docs/40-implementation/`：Agent 基于源码维护的当前实现说明，面向开发者阅读。
- `docs/90-notes/`：历史、调研、归档和学习材料，不作为当前实现、契约或验收依据。

当 `docs/40-implementation/` 与源码冲突时，以源码为准。功能开发完成后，如果需要更新解释材料，应先通知用户并获得同意，再基于最终源码更新。

## 3. Matt Skills 与工作流

本仓库优先使用以下 Matt workflow skills：

- `cyz-grill-with-docs`：澄清想法，并按需维护 glossary / ADR。
- `cyz-to-spec`：把已澄清的讨论发布为 `docs/matt_docs/scratch/<feature-slug>/spec.md`。
- `cyz-to-tickets`：把 spec 或计划拆成 blocker-first tickets。
- `cyz-domain-modeling`：维护 `docs/matt_docs/CONTEXT.md` 和 `docs/matt_docs/adr/`。
- `cyz-handoff`：按 Matt 原版行为写临时 handoff，不写入仓库。

## 4. 开发规则

开发应依据设计稿类文档：

1. 产品能力、用户场景、非目标变化，先与用户讨论并确认，再更新 `docs/10-product/`。
2. 模块长期功能、定位和边界变化，先与用户讨论并确认，再更新 `docs/20-design/module-boundaries.md`。
3. API、DB、A2UI、Shared Types 等跨模块数据变化，先与用户讨论并确认，再更新 `docs/30-contracts/`。
4. 设计稿确认后，再实现代码。
5. 实现代码时，以源码为当前实现真相，不以 `docs/40-implementation/` 代替读代码。

## 5. 解释材料更新规则

功能开发、重构或修复完成后，如果当前实现说明需要同步：

1. 先告知用户哪些 `docs/40-implementation/` 内容需要更新。
2. 等用户同意后，再由 Agent 基于最终源码更新解释材料。
3. 不要在开发前把预期实现写入 `docs/40-implementation/`。
4. 不要让 `docs/40-implementation/` 覆盖源码事实。

## 6. 任务关闭检查

完成代码或文档任务前检查：

1. 是否运行了相关测试；如果没有，说明原因。
2. 是否检查了 `git status --short`。
3. 设计稿变化是否已与用户确认，并同步到 `docs/10-product/`、`docs/20-design/module-boundaries.md` 或 `docs/30-contracts/`。
4. 如果存在相关 Matt issue，是否更新其状态、结果或遗留问题。
5. 是否需要请求用户同意后更新 `docs/40-implementation/`。
6. 重要用户可见、契约、架构或文档系统变化是否更新 `docs/CHANGELOG.md`。

## 7. 项目结构

```text
packages/
  shared/     # 共享类型、DTO、A2UI message、SSE event、Agent result
  renderer/   # Vue3 A2UI Renderer
  frontend/   # 平台工作台
  backend/    # Express API、Prisma、SSE、文件和业务编排
  agent/      # Agent Runtime、Prompt、ModelClient、validateA2UI