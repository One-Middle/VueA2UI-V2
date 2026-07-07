# A2UI Agent 平台文档入口

本文档是 `docs/` 目录的总入口，用于帮助产品、前端、后端、Renderer、Agent 和集成开发快速定位相关资料。

## 1. 项目定位

本项目是一个全栈 Agent 无代码 A2UI 创作平台。用户通过对话或上传 `.txt` 文件描述 UI 需求，后端 Agent Runtime 生成 A2UI v0.9 消息；消息经 `validateA2UI` 校验后由后端提交，前端 Vue3 Renderer 渲染为可交互 UI。

核心模块：

- `packages/shared`：跨模块共享类型、DTO、SSE、A2UI 协议类型。
- `packages/renderer`：A2UI v0.9 Vue3 Renderer。
- `packages/frontend`：平台工作台、会话、预览、历史、调试与导入导出。
- `packages/backend`：Express API、Prisma、PostgreSQL、SSE、文件和 Agent 编排。
- `packages/agent`：Agent Runtime、Prompt、模型调用、A2UI 校验与修复循环。

## 2. 推荐阅读路径

### 2.1 第一次了解项目

1. [开发启动说明](./development-start.md)
2. [项目主要功能结构](./project-feature-structure.md)
3. [项目结构说明](./project-structure.md)
4. [PRD](./product/agent-platform-prd.md)
5. [设计文档](./product/agent-platform-design.md)
6. [API 设计](./product/agent-platform-api.md)
7. [数据库 Schema 设计](./product/agent-platform-db-schema.md)
8. [模块实现规格](./product/agent-platform-module-specs.md)

### 2.2 准备开发功能

1. 先读全局契约：
   [开发启动说明](./development-start.md)、
   [设计文档](./product/agent-platform-design.md)、
   [API 设计](./product/agent-platform-api.md)、
   [数据库 Schema 设计](./product/agent-platform-db-schema.md)。
2. 再读对应模块的实现说明和任务清单。
3. 最后查看跨模块集成任务，确认改动是否影响端到端链路。

### 2.3 排查端到端问题

1. [集成实现详情](./integration/integration-implementation-details.md)
2. [跨模块集成任务清单](./product/tasks/integration-tasks.md)
3. [Backend 模块实现详情](./backend/backend-implementation-details.md)
4. [Frontend 模块实现详情](./frontend/frontend-implementation-details.md)
5. [Agent Runtime 模块实现详情](./agent/agent-runtime-implementation-details.md)
6. [Renderer 模块实现详情](./renderer/renderer-implementation-details.md)

## 3. 按角色阅读

### 产品与需求

- [PRD](./product/agent-platform-prd.md)：产品目标、用户体验、功能范围和成功指标。
- [项目主要功能结构](./project-feature-structure.md)：主要功能域、工作流、页面结构和端到端功能链路。
- [项目结构说明](./project-structure.md)：仓库目录、packages 分层、关键源码入口和生成目录说明。
- [设计文档](./product/agent-platform-design.md)：总体架构、模块边界和核心链路。
- [模块实现规格](./product/agent-platform-module-specs.md)：各模块职责、业务逻辑、API 映射和验收标准。
- [全模块实施计划](./product/agent-platform-implementation-plan.md)：阶段计划和实施顺序。

### 前端工作台

- [Frontend 模块实现说明](./frontend/frontend-implementation.md)：模块定位、页面结构、状态管理和 API 集成。
- [Frontend 模块实现详情](./frontend/frontend-implementation-details.md)：目录结构、页面、功能模块和关键实现。
- [Frontend 模块任务清单](./frontend/tasks.md)：前端任务拆分与验收点。

### Renderer

- [Frontend Renderer 模块实现说明](./frontend/renderer/renderer-implementation.md)：Renderer 定位、核心对象、消息支持和 MVP 组件范围。
- [Frontend Renderer 模块任务清单](./frontend/renderer/tasks.md)：Renderer 任务拆分。
- [A2UI 协议认识](./frontend/renderer/protocol/A2UI协议认识.md)：A2UI 协议概念、价值和核心模型。
- [A2UI v0.9 渲染器实现指南](./frontend/renderer/a2ui-renderer-v0_9-guide.md)：渲染器实现路径和能力要求。
- [Renderer 模块实现详情](./renderer/renderer-implementation-details.md)：Renderer 内部模型、消息处理和组件实现细节。

### 后端

- [Backend 模块实现说明](./backend/backend-implementation.md)：模块定位、服务分层、事务边界和验收标准。
- [Backend 模块实现详情](./backend/backend-implementation-details.md)：文件结构、API 列表、服务层和数据访问。
- [Backend 模块任务清单](./backend/tasks.md)：后端任务拆分与验收点。
- [数据库 Schema 设计](./product/agent-platform-db-schema.md)：Prisma/PostgreSQL 数据模型契约。
- [API 设计](./product/agent-platform-api.md)：后端 HTTP API 契约。

### Agent Runtime

- [Agent Runtime 模块实现说明](./agent/agent-runtime-implementation.md)：Runtime 定位、状态机、输出契约和验收标准。
- [Agent Runtime 模块实现详情](./agent/agent-runtime-implementation-details.md)：ContextBuilder、PromptComposer、ModelClient、校验与修复循环。
- [Agent Runtime 模块任务清单](./agent/tasks.md)：Agent 任务拆分与验收点。

### 共享类型与集成

- [共享类型规格说明](./shared/shared-types-spec.md)：`packages/shared` 类型契约。
- [集成实现详情](./integration/integration-implementation-details.md)：端到端成功路径、失败路径和模块集成点。
- [跨模块集成任务清单](./product/tasks/integration-tasks.md)：共享类型、Mock 链路、真实 Agent 链路和 SSE 集成任务。

## 4. 全量文档索引

### 根目录

- [开发启动说明](./development-start.md)
- [项目主要功能结构](./project-feature-structure.md)
- [项目结构说明](./project-structure.md)

### Product

- [PRD](./product/agent-platform-prd.md)
- [设计文档](./product/agent-platform-design.md)
- [API 设计](./product/agent-platform-api.md)
- [数据库 Schema 设计](./product/agent-platform-db-schema.md)
- [模块实现规格](./product/agent-platform-module-specs.md)
- [全模块实施计划](./product/agent-platform-implementation-plan.md)
- [跨模块集成任务清单](./product/tasks/integration-tasks.md)

### Shared

- [共享类型规格说明](./shared/shared-types-spec.md)

### Frontend

- [Frontend 模块实现说明](./frontend/frontend-implementation.md)
- [Frontend 模块实现详情](./frontend/frontend-implementation-details.md)
- [Frontend 模块任务清单](./frontend/tasks.md)

### Renderer

- [Frontend Renderer 模块实现说明](./frontend/renderer/renderer-implementation.md)
- [Frontend Renderer 模块任务清单](./frontend/renderer/tasks.md)
- [A2UI 协议认识](./frontend/renderer/protocol/A2UI协议认识.md)
- [A2UI v0.9 渲染器实现指南](./frontend/renderer/a2ui-renderer-v0_9-guide.md)
- [Renderer 模块实现详情](./renderer/renderer-implementation-details.md)

### Backend

- [Backend 模块实现说明](./backend/backend-implementation.md)
- [Backend 模块实现详情](./backend/backend-implementation-details.md)
- [Backend 模块任务清单](./backend/tasks.md)

### Agent

- [Agent Runtime 模块实现说明](./agent/agent-runtime-implementation.md)
- [Agent Runtime 模块实现详情](./agent/agent-runtime-implementation-details.md)
- [Agent Runtime 模块任务清单](./agent/tasks.md)

### Integration

- [集成实现详情](./integration/integration-implementation-details.md)

## 5. 文档维护约定

- 新增产品能力时，应同步更新 PRD、设计文档、API/DB 契约和对应模块文档。
- 跨模块类型变更应先更新共享类型规格，再更新模块实现文档。
- 后端 API 变化应同步更新 API 设计、Backend 文档和 Frontend API 集成说明。
- Prisma Schema 变化应同步更新数据库 Schema 设计和相关模块文档。
- Agent 输出契约变化应同步更新 Agent 文档、Renderer 文档和集成文档。
- 所有项目文档保持中文。
