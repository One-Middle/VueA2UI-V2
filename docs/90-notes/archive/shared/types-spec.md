# packages/shared 共享类型规格说明

## 概述

`packages/shared` 是 monorepo 中所有模块（frontend、renderer、backend、agent）的类型契约来源。本文档记录该包中所有类型定义、依赖关系和注意事项。

## 文件结构

```text
packages/shared/src/
  a2ui.ts   # A2UI v0.9 协议相关类型 + Catalog 定义
  api.ts    # API 请求/响应 DTO 类型
  agent.ts  # Agent 运行时相关类型
  sse.ts    # SSE 事件类型
  index.ts  # 统一导出入口（export *）
```

## 新增类型清单

### 1. `src/a2ui.ts` — Catalog 相关类型（新增）

| 类型 / 值 | 分类 | 说明 |
|---|---|---|
| `BASIC_CATALOG_COMPONENTS` | 常量（`as const` 数组） | Basic Catalog 18 个组件名称的只读数组 |
| `BasicCatalogComponent` | 类型（联合类型） | 从数组推导出的组件名称字面量联合类型 |
| `CatalogComponentProperty` | 接口 | 单个属性的元数据定义（name、type、defaultValue、required、description、values） |
| `CatalogComponentDefinition` | 接口 | 单个组件的 schema 定义（component、description、properties） |
| `CatalogDefinition` | 接口 | 完整 Catalog 定义（catalogId、version、components） |

**设计意图：**

- `BASIC_CATALOG_COMPONENTS` 用作运行时校验的允许组件名称列表，同时推导出 `BasicCatalogComponent` 类型供其他模块使用。
- `CatalogDefinition` 与 A2UI 协议中的 `catalogId` / `catalogVersion` 配合，用于 Renderer 注册组件和 Agent prompt 中的组件能力描述。

### 2. `src/api.ts` — CRUD 请求/响应类型（新增）

| 类型 | 分类 | 说明 |
|---|---|---|
| `CreateSessionRequest` | 接口 | 创建会话请求（title、description、modelName 均可选） |
| `UpdateSessionRequest` | 接口 | 更新会话请求（title、description、status 均可选） |
| `SessionDetailResponse` | 接口 | 会话详情响应（session + currentSnapshot + enabledSkillIds） |
| `CreateSkillRequest` | 接口 | 创建 Skill 请求（name 必填、description 可选、content 必填） |
| `UpdateSkillRequest` | 接口 | 更新 Skill 请求（所有字段可选，支持部分更新） |
| `RuntimeConfigDto` | 接口 | 运行时配置完整 DTO，与 API 文档 12.1 对齐 |
| `UpdateRuntimeConfigRequest` | 接口 | 更新运行时配置请求（所有字段可选） |
| `ExportSessionDto` | 接口 | 导出完整会话 DTO，与 API 文档 11.1 对齐 |
| `AgentRunDetailResponse` | 接口 | Agent Run 详情响应（agentRun + toolCalls + assistantMessage + a2uiEvents） |
| `SessionSkillDto` | 接口 | 会话-Skill 关联表 DTO（sessionId、skillId、enabled） |

### 3. `src/sse.ts` — AgentRunPhase 类型（新增 + 修改）

| 类型 | 分类 | 说明 |
|---|---|---|
| `AgentRunPhase` | 类型（联合类型） | Agent 运行阶段枚举：`PREPARE_CONTEXT`、`GENERATE_DRAFT`、`VALIDATE_DRAFT`、`REPAIR_DRAFT`、`COMMIT`、`FAILED` |

**修改：** `PlatformSseEvent` 中 `agent_run_attempt` 事件的 `phase` 字段从 `string` 改为 `AgentRunPhase`，提供编译时类型检查。

### 4. `src/index.ts` — 无需修改

因使用 `export *` 语法，所有新增类型自动导出。

## 类型依赖关系

```text
a2ui.ts (独立，无外部依赖)
  └── 被 api.ts 导入（A2UIClientMessage、A2UIServerMessage、JsonObject、SurfaceSnapshotData）
  └── 被 agent.ts 导入（A2UIServerMessage、JsonObject、SurfaceSnapshotData）

api.ts
  └── 被 sse.ts 导入（A2UIEventDto、AgentRunDto、MessageDto、SurfaceSnapshotDto、ToolCallDto）

agent.ts
  └── 被 sse.ts 间接使用（通过 api.ts 的类型）

sse.ts
  └── 依赖 api.ts 的 DTO 类型
  └── 新增 AgentRunPhase（独立类型，不依赖其他模块）

index.ts
  └── 通过 export * 导出所有模块的公开类型
```

## 使用注意事项

### 模块边界

- **Renderer** 只能使用 `a2ui.ts` 和 `agent.ts` 中的类型，不应引入 `api.ts`（后端 DTO）或 `sse.ts`。
- **Backend** 应使用 `api.ts`、`sse.ts` 和 `a2ui.ts` 中的所有类型。
- **Agent** 应使用 `agent.ts` 和 `a2ui.ts` 中的类型，不应直接使用 `api.ts` 中的 API DTO。
- **Frontend** 可以使用所有类型。

### Catalog 类型使用

- `BASIC_CATALOG_COMPONENTS` 是 `as const` 常量数组，运行时可用于校验组件名称是否在允许列表中，编译时通过 `BasicCatalogComponent` 提供类型约束。
- `CatalogComponentProperty.type` 字段存储属性类型描述字符串（如 `"string"`、`"number"`、`"boolean"`、`"string[]"`），用于文档和校验，不是 TypeScript 类型。
- `CatalogDefinition.version` 与 `catalogVersion` 保持一致，如 `"v0.9"`。

### API 请求/响应类型

- 所有 `*Request` 类型均为可选字段（除明确标记的必填项），用于 PATCH/部分更新接口。
- `ExportSessionDto` 包含 `sessionSkills: SessionSkillDto[]` 字段，对应会话与 Skill 的多对多关联表。
- `RuntimeConfigDto` 中的 `baseUrlConfigured` 和 `apiKeyConfigured` 只表示是否配置，不返回实际密钥值。

### SSE 类型

- `AgentRunPhase` 定义了 Agent 运行的完整生命周期阶段，后端应在 SSE `agent_run_attempt` 事件中按此枚举推送当前阶段。
- 前端可根据 `AgentRunPhase` 值渲染不同的进度指示器（如"正在构建上下文"、"正在生成草稿"、"正在校验"等）。

### 类型维护

1. 跨包类型变更必须先更新 `packages/shared`，再更新调用方模块。
2. 不要在业务模块内复制定义共享 DTO，始终从 `@shared` 导入。
3. 新增 API 端点如有请求/响应类型，应在 `api.ts` 中新增，不要散落在业务模块中。
4. 所有类型注释使用中文，保持与项目文档语言一致。

