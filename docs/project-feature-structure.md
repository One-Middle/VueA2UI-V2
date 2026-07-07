# 项目主要功能结构

本文档从功能视角梳理 A2UI Agent 平台的主要能力、页面结构和端到端链路。它不替代 PRD、设计文档、API 文档和模块实现文档，而是作为理解项目功能版图的快速入口。

## 1. 功能总览

A2UI Agent 平台的核心目标是：让用户通过自然语言或 `.txt` 需求文档生成、预览、持续修改并导出声明式 A2UI UI。

主要功能域：

- 对话创作：通过输入框描述 UI 需求，创建会话并触发 Agent 生成。
- 实时预览：将通过校验的 A2UI 消息交给 Vue3 Renderer 渲染。
- 会话历史：保存并查看会话、用户消息、Assistant 消息、A2UI events 和 surface snapshots。
- 文件输入：上传 `.txt` 需求文档，作为 Agent 上下文的一部分。
- Skills 管理：维护文本型 skill，并在会话中启用或禁用。
- Runtime 与调试：查看模型配置、Agent run、校验过程和工具调用信息。
- 导入导出：导出会话、A2UI JSONL 和当前 surface snapshot。

## 2. 用户工作流

### 2.1 首次生成 UI

1. 用户进入工作台的“对话”页面。
2. 用户直接在输入框中描述 UI 需求。
3. 如果当前没有会话，前端自动创建会话。
4. 后端保存用户消息并启动 Agent run。
5. Agent 构建上下文、调用模型、生成 A2UI 草稿。
6. Agent 强制执行 `validateA2UI`。
7. 校验通过后，后端提交 A2UI events 和 surface snapshot。
8. 前端通过响应或 SSE 接收结果，Renderer 渲染 UI。

### 2.2 持续修改 UI

1. 用户基于当前预览继续输入修改需求。
2. 后端把最近消息、当前 surface snapshot、上传文件和已启用 skills 放入 Agent 上下文。
3. Agent 生成增量 A2UI 消息，例如 `updateComponents` 或 `updateDataModel`。
4. 校验通过后，Renderer 应用新的消息批次。
5. 每次修改都会形成可追踪的消息、events、run 日志和 snapshot。

### 2.3 使用需求文档生成 UI

1. 用户在会话中上传 `.txt` 文件。
2. 后端校验文件类型和大小，读取并保存文件内容。
3. 用户发送生成或修改指令。
4. AgentContextBuilder 将上传文件内容注入上下文。
5. Agent 基于文本需求和对话指令生成 A2UI。

### 2.4 导出产物

用户可以导出：

- 会话 JSON：用于审查完整创作过程。
- A2UI JSONL：用于复现或分析提交过的 A2UI 消息流。
- Surface snapshot JSON：用于保存当前渲染状态。

## 3. 工作台页面结构

工作台采用左侧导航加右侧功能区的结构。MVP 主要页面如下。

### 3.1 对话

定位：平台的默认入口，承担 UI 创作和修改的主流程。

核心能力：

- 展示用户与 Assistant 消息。
- 支持无会话状态下直接输入并自动创建会话。
- 支持发送文本需求。
- 支持上传 `.txt` 文件作为上下文。
- 展示发送中、Agent 运行中、失败等状态。
- 与预览区联动展示生成结果。

### 3.2 预览

定位：展示当前会话的 A2UI 渲染结果。

核心能力：

- 接收已提交的 A2UI 消息批次。
- 调用 Renderer 更新 surface 状态。
- 展示当前 UI 渲染结果。
- 记录或展示 Renderer action 和 error。
- 为排查 unknown component、missing child、数据绑定错误提供反馈入口。

### 3.3 历史

定位：查看会话和产物演进过程。

核心能力：

- 查看历史会话列表。
- 查看会话消息。
- 查看 A2UI event 批次。
- 查看 surface snapshot 列表和当前 snapshot。
- 查看 Agent run 记录和运行状态。

### 3.4 Skills

定位：管理可注入 Agent 上下文的文本型能力说明。

核心能力：

- 创建或编辑 skill 文本。
- 查看 skill 列表。
- 在当前会话中启用或禁用 skill。
- 将已启用 skill 注入下一次 Agent run 的上下文。

约束：

- Skill 仅作为文本指令，不带来任意代码执行能力。
- Skill 不允许让 Agent 绕过 Catalog、Schema 或 `validateA2UI`。

### 3.5 导入导出

定位：管理需求输入和平台产物输出。

核心能力：

- 上传 `.txt` 需求文件。
- 导出完整会话。
- 导出 A2UI JSONL。
- 导出当前 surface snapshot。

MVP 约束：

- 文件读取只允许用户上传的 `.txt` 文件。
- 不提供任意本地路径读取。
- 不提供外部 HTTP/API 工具。

### 3.6 Runtime

定位：查看运行时配置和调试 Agent 链路。

核心能力：

- 查看模型提供方、模型名称和基础配置状态。
- 查看 Agent run 阶段。
- 查看校验结果、修复次数和失败原因。
- 查看 tool call 日志。
- 辅助定位模型输出、A2UI 校验、后端提交和 Renderer 消费问题。

## 4. 后端功能结构

后端负责业务编排、持久化、SSE 和 Agent 调用，不直接生成 A2UI 组件树。

主要功能：

- Session API：创建、查询、更新会话。
- Message API：保存用户消息和 Assistant 消息。
- Agent Run 编排：启动生成任务、记录状态和尝试次数。
- File API：上传、读取、删除 `.txt` 文件。
- Skills API：管理 skill，并维护会话启用关系。
- A2UI Events：保存通过校验的 A2UI 消息批次。
- Surface Snapshots：保存每次提交后的 materialized surface 状态。
- Renderer 回传：记录 action 和 error。
- Export API：导出会话、A2UI JSONL 和 snapshot。
- SSE：向前端推送 Agent 状态、Assistant 消息、A2UI 消息和 snapshot。

关键原则：

- 后端只持久化通过 `validateA2UI` 的 A2UI 消息。
- 后端不绕过 Agent Runtime 提交模型输出。
- 后端不负责 Renderer 内部状态机。

## 5. Agent 功能结构

Agent Runtime 负责把用户意图转换成合法 A2UI 消息。

主要功能：

- ContextBuilder：收集用户输入、最近消息、上传文件、已启用 skills、当前 snapshot 和 Catalog 摘要。
- PromptComposer：构建初始 prompt 和 repair prompt。
- ModelClient：调用 OpenAI-compatible API。
- OutputParser：解析模型返回的结构化 JSON。
- validateA2UI：校验 A2UI v0.9 消息和 Basic Catalog 约束。
- Repair Loop：校验失败后最多进行三次修复。
- Result Builder：返回成功或失败的结构化结果。

运行阶段：

1. `PREPARE_CONTEXT`
2. `GENERATE_DRAFT`
3. `VALIDATE_DRAFT`
4. `REPAIR_DRAFT`
5. `COMMIT`
6. `FAILED`

关键原则：

- Agent 不生成任意 HTML、JavaScript 或 CSS。
- Agent 不读取任意本地路径。
- Agent 不直接写数据库。
- Agent 不能使用 Basic Catalog 之外的组件、属性或函数。

## 6. Renderer 功能结构

Renderer 负责消费合法 A2UI 消息并渲染 UI。

主要功能：

- MessageProcessor：处理 A2UI 服务端消息。
- SurfaceGroupModel：管理多个 surface。
- SurfaceModel：维护单个 surface 的组件、数据、主题和事件派发。
- DataModel：支持 JSON Pointer 读写。
- ComponentModel：维护组件类型、属性和子组件引用。
- Basic Catalog 组件：将 A2UI 组件映射为 Vue 组件。
- Action 派发：将用户交互转为 Renderer action。
- Error 派发：将渲染或绑定错误回传工作台。

支持的核心消息：

- `createSurface`
- `updateComponents`
- `updateDataModel`
- `deleteSurface`

关键原则：

- Renderer 不访问后端 API。
- Renderer 不持久化会话。
- Renderer 不修复 Agent 输出。
- Renderer 的内部状态不放入 Pinia。

## 7. 数据与产物流转

### 7.1 核心数据对象

- Session：一次 UI 创作上下文。
- Message：用户和 Assistant 的自然语言消息。
- UploadedFile：用户上传的 `.txt` 文件。
- Skill：可注入 Agent 上下文的文本说明。
- AgentRun：一次模型生成或修复过程。
- ToolCall：校验等工具调用记录。
- A2UIEvent：已提交的 A2UI 消息批次。
- SurfaceSnapshot：某次提交后的当前 surface 状态。
- RendererEvent：Renderer action 或 error 回传。

### 7.2 生成链路

```text
用户输入
  -> Frontend
  -> Backend Message API
  -> Agent Runtime
  -> ModelClient
  -> validateA2UI
  -> Backend Commit
  -> A2UI Events + Surface Snapshot
  -> SSE / API Response
  -> Frontend Renderer
  -> UI Preview
```

### 7.3 错误链路

```text
模型输出无效
  -> validateA2UI 返回错误
  -> Agent 构建 repair prompt
  -> 重新调用模型
  -> 最多重试 3 次
  -> 仍失败则记录 AgentRun FAILED
  -> 不提交 A2UI events
  -> 前端展示结构化失败信息
```

## 8. MVP 边界

包含：

- 单用户工作台。
- 自然语言生成和修改 UI。
- `.txt` 文件上下文。
- 文本型 skills。
- Basic Catalog 固定组件集合。
- A2UI v0.9 消息校验、提交和渲染。
- 会话、消息、events、snapshots、Agent runs 持久化。
- 导出会话、A2UI JSONL 和 snapshot。

不包含：

- 登录和多用户权限。
- 任意 HTML、JavaScript 或 CSS 生成。
- 自由拖拽画布编辑器。
- 外部 HTTP/API 工具。
- 任意本地文件读取。
- 用户自选 Catalog。
- 多 Agent 编排框架。

## 9. 相关文档

- [文档入口](./README.md)
- [PRD](./product/agent-platform-prd.md)
- [设计文档](./product/agent-platform-design.md)
- [API 设计](./product/agent-platform-api.md)
- [数据库 Schema 设计](./product/agent-platform-db-schema.md)
- [模块实现规格](./product/agent-platform-module-specs.md)
- [集成实现详情](./integration/integration-implementation-details.md)
