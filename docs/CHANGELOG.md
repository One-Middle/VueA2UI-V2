# 更新日志

## 2026-08-20

### Workflow

- 支持 `failed_retryable` workflow 的普通消息续跑：用户追加消息后复用最新失败 step，创建新的 AgentRun 记录本次尝试，并让前端根据 `SendMessageResponse.workflow` 更新运行状态。
- 更新 API、数据库和前后端实现文档，明确普通消息恢复失败 workflow 的语义。

## 2026-08-08

### 文档治理

- 建立 Matt-first 文档系统：新增 `docs/matt_docs/`，将 Agent 任务工作流、CONTEXT、ADR、spec 和本地 issues 迁入 Matt 路径迁移版。
- 将旧 `docs/50-delivery/` 完全迁移到 `docs/90-notes/archive/delivery/`，新任务推进改由 `docs/matt_docs/scratch/` 承担。
- 将旧 `docs/20-design/decisions/` 迁移到 `docs/matt_docs/adr/`，后续新 ADR 采用 Matt 轻量格式。
- 将 `docs/20-design/` 瘦身为模块功能、定位和边界文档，旧项目概览和系统设计说明迁入 `docs/90-notes/archive/design/`。
- 移除 `docs/00-governance/`，将精简文档治理和 Agent 行为规则收敛到 `.codex/AGENTS.md`。

### Agent

- 重构 `builtin:a2ui-v0.9-generation` 平台 Skill：主 Skill 删除旧示例片段，改为要求 UI 生成前请求 `a2ui-generation-standards`，复杂 UI 再请求 `high-quality-a2ui-good-cases`。
- 将旧的三个碎片化 A2UI Reference 替换为 `a2ui-generation-standards` 和 `high-quality-a2ui-good-cases`；前者包含标准生成规则、bad case 和输出检查，后者包含 Music Player、Finance Brief、Work Board 三个完整 good case。

## 2026-08-04

### 文档治理

- 将文档系统升级为面向 AI Coding 的六层模型：`00-governance`、`10-product`、`20-design`、`30-contracts`、`40-implementation`、`50-delivery`、`90-notes`。
- 将旧产品、架构、契约、模块、运维、计划和历史归档目录迁移到新分层结构，并更新文档入口、阅读路径和治理规则。
- 更新 `.codex/AGENTS.md`，明确 `30-contracts/` 是跨模块数据交互最高真相源，`40-implementation/` 必须基于源码维护，`90-notes/` 不作为开发或验收依据。
- 新增项目级 Skill 源文件：`docs-system-init` 用于初始化或迁移项目文档系统，`docs-change-maintenance` 用于功能新增、修改、重构或修复时同步维护文档。

## 2026-08-04

### 文档

- 更新 `docs/99-archive/renderer/implementation-details.md`，同步当前 Renderer 消息处理、状态模型、动态绑定、脚本、action、受控视觉、Basic Catalog 组件矩阵和能力缺陷。

## 2026-08-03

### Shared

- Basic Catalog 组件集合新增 `Grid`、`Container`、`Spacer`，用于以语义化组件表达二维网格、页面容器和受控空隙。

### Agent

- `basic-catalog-schema.json` 放行新增布局组件和组件语义字段，覆盖 `Text.decoration/role/emphasis`、`Button.label/icon/intent/shape/importance`、`Card.role/density/selected`、`Image.role/shape/fallbackText`、表单 `validationState/helpText/errorText/readonly/density` 等能力。
- 同步更新 Agent Basic Catalog 渐进披露定义，使模型可按需获取新增组件和语义字段说明，而不是只依赖校验 schema。

### Renderer

- 新增 `GridComponent`、`ContainerComponent`、`SpacerComponent`，并注册到 Basic Catalog Renderer。
- 扩展现有 Basic 组件的语义字段消费：文本删除线/旧价格/强调、按钮标签与图标、卡片头部与密度、图片角色与加载失败兜底、图标语义、列表空状态/加载态、Row/Column 布局角色与分隔、表单校验状态与辅助说明。
- 优化 `renderer-capability-demo` 示例集，使用商品、课程、音乐、待办和指标看板覆盖新增语义字段，并改用内置图片资产避免示例依赖外部网络。
- 将 `renderer-capability-demo` 商品示例调整为直播电商卡片，覆盖直播封面、商品货架、互动计数、加购和立即购买事件。
- `GridComponent` 支持动态模板 children，使网格组件也能像 `List` 一样基于数据集合重复渲染模板组件。
- 补充 `styles.css` 中的语义样式类，使新增字段通过受控 class 产生稳定视觉效果，避免继续扩大通用 CSS 白名单。

### 测试

- 新增 Renderer 回归测试，覆盖新增布局组件和语义字段渲染。
- 新增 Agent 校验测试，确认新增语义字段和布局组件可通过 `validateA2UI`。

## 2026-08-02

### Renderer

- JSRuntime 从单一 SES `Compartment` 实现调整为工厂 + 双实现：默认使用 `new Function` 路径，保留 SES 路径并可通过 `js-runtime.config.ts` 切换。
- `new Function` 路径新增 AST guard，执行前拦截浏览器全局对象、动态执行能力、原型链逃逸入口和动态成员访问等高风险脚本。
- 新增 JSRuntime 回归测试，覆盖属性脚本、`action.script`、AST guard 拦截和受控 dataModel/actions 能力。
- 修复 `action.script` 与属性脚本 `{ script }` 形状相同导致 action 解析被提前当成属性脚本执行的问题。

## 2026-07-26

### 文档

- 将 `docs/40-implementation/modules/` 下的模块文档从平铺 Markdown 调整为独立子目录入口：`docs/40-implementation/modules/<module>/README.md`。
- 将 Renderer Basic Catalog 能力矩阵迁移到 `docs/40-implementation/modules/renderer/basic-catalog-capabilities.md`，并同步更新文档索引和相对链接。

## 2026-07-21

### Renderer

- 新增 Renderer JSRuntime MVP：基于 SES `Compartment` 执行受限同步脚本。
- 新增 `action.script`，Button 可在点击时执行脚本，读写当前 surface 的 `dataModel`，并通过 `actions.emit` 派发标准 `a2ui:action`。
- 新增属性脚本 `{ script: { code, deps, fallback } }`，支持只读 `dataModel.get` 计算属性值，并通过必填 `deps` 建立最小订阅。
- `visual-props.ts` 支持 `style.<白名单字段>.script`，动态样式仍受 Renderer 白名单约束。
- 补充 Renderer 回归测试，覆盖属性脚本文本、动态样式、`action.script` 和脚本错误 fallback。

### Agent / Shared / 文档

- Shared A2UI 类型新增属性脚本和 `action.script` 声明。
- Basic Catalog schema 放行属性脚本、样式字段脚本和 `action.script`。
- 新增 `docs/50-delivery/planning/2026-07-renderer-js-runtime/` 平台改造计划，并同步 A2UI 契约和 Renderer 模块文档。

## 2026-07-20

### Renderer

- 优化 `DataModel` 响应式实现，深层 JSON Pointer 写入、根数据替换和自动创建对象/数组路径均可稳定驱动 Vue 组件刷新。
- `DataContext` 增加 dataModel 作用域传递能力，递归渲染组件会保留当前相对路径上下文。
- 动态 `List` 为每个 item 建立独立数据作用域，模板组件可使用相对 `{ path: "title" }` 读取当前项字段。
- 根节点替换会通知所有已注册 `DataModel.subscribe()` 路径订阅，保留路径级监听扩展能力。
- 新增 Renderer dataModel 响应式回归测试，覆盖深层更新、根替换、自动建路径、订阅通知、动态列表 item 作用域和 DOM 刷新。
- 更新 Renderer 模块说明和 Basic Catalog 能力矩阵，明确 `updateDataModel` 与动态 List 的当前实际能力。

## 2026-07-19

### Agent Runtime

- Skill 支持 `references` 参考资料列表；Runtime 初始 Prompt 只展示 Reference 摘要，模型可通过 `skillReferenceRequest` 按需请求正文，并记录 `getSkillReferenceContent` 工具调用。
- 将 A2UI v0.9 生成指南从固定 system prompt 迁移为 `builtin:a2ui-v0.9-generation` 基础 Skill；Runtime 始终内建注入该 Skill，模型通过 `skillInfoRequest` 渐进披露完整生成规则。
- `PromptComposer` 改为只注入 Agent 身份、能力边界、工作流、输出通道和安全禁令；工作流明确为“理解用户需求 -> 向用户确认自己的理解 -> 开始生成 -> 校验 -> 提交”。
- 最终 `assistantMessage` 需先简要复述对用户需求的理解，再说明生成或修改结果；`validateA2UI` 仍是正式提交门禁。

### 文档治理

- 将 `docs/` 调整为编号化分层：`00-meta`、`01-product`、`02-architecture`、`03-contracts`、`04-modules`、`05-operations`、`06-planning`、`90-notes`、`99-archive`。
- 新增 `docs/00-governance/taxonomy.md`、`maintenance.md` 和 `reading-paths.md`，明确文档分类、权威等级、事实归属、冲突规则和阅读路径。
- 将 `06-planning/` 从单一当前任务清单升级为平台改造计划区；每次较大改造使用独立子目录记录背景、计划、清单、进展、决策和结果。
- 新增 `docs/90-notes/README.md`，规定 AI/人工阅读笔记默认非权威，并提供笔记元信息模板。
- 将 Renderer Basic Catalog 当前能力矩阵从历史归档移动到 `docs/40-implementation/modules/renderer/basic-catalog-capabilities.md`。
- 更新模块文档，补充关键类、核心对象和关键文件说明。
- 更新 `docs/README.md`，明确新的文档结构、权威来源规则和维护约定。

### Renderer

- 移除 `Button.action` 旧版扁平 `{ name, context }` 的历史兼容逻辑；Renderer 当前只派发正式 `action.event`，`action.functionCall` 仍只识别不执行。

## 2026-07-12

### Agent Runtime

- **模块解耦重构**：将 Agent 公共 API 从直接暴露内部类（`AgentRuntime`、`ModelClient`、`PromptComposer`、`AgentContextBuilder`）改为暴露 `createAgentRuntime()` 工厂函数 + `IAgentRuntime` 接口。后端不再感知 Agent 内部组装细节。
- 新增 `IAgentRuntime` 接口（定义在 `packages/shared/src/agent.ts`），任何 Agent 实现只需实现此接口即可被后端调用。
- 新增 `AgentRuntimeFactoryConfig` 配置类型和 `AgentRuntimeFactory` 工厂签名，替换 Agent 实现只需改一行 import。
- 新增 `create-agent-runtime.ts` 工厂函数，封装内部依赖创建与组装。
- `AgentRuntime` 显式声明 `implements IAgentRuntime`。
- 新增工厂函数单元测试。
- 更新 `docs/modules/agent.md`：新增公共 API 与模块边界章节，更新文件职责表。
- 更新 `docs/contracts/shared-types.md`：补充 Agent Runtime 共享字段说明。
- 新增 `docs/archive/agent/context-orchestration.md`：Agent 上下文编排与组成技术文档。

### Backend

- `agent-run.service.ts` 移除对 `AgentRuntime`、`ModelClient`、`PromptComposer`、`AgentContextBuilder` 的直接依赖，改为使用 `createAgentRuntime()` 工厂 + `IAgentRuntime` 接口。

### Renderer

- Button action 正式迁移到 `action.event`：Renderer 优先解析官网式事件声明，派发 `{ version: "v0.9", action: { kind: "event", ... } }` A2UI client message，并仅保留旧版 `{ name, context }` 历史兼容。
- 新增 Basic Catalog 受控视觉属性解析工具，Renderer 开始消费既有协议中的 `style`、`variant`、`size`、`tone`、`preset` 字段。
- `Card`、`Button`、`Icon`、`Image`、`Row`、`Column`、`Slider`、`Text` 接入受控样式和视觉修饰类，补齐音乐卡片等场景所需的基础渲染能力。
- 修复 `Icon` 只读取旧字段 `icon` 的问题，现在优先读取协议推荐的 `name` 并兼容 `icon`。
- `Image` 支持 `fit`、`aspectRatio`、`loading`，并兼容 `1:1` 形式的比例写法。
- `Slider` 支持 `step`、`disabled`、`showValue`、数值前后缀，`showValue: false` 不再显示当前值。
- 新增 Renderer 视觉属性回归测试，覆盖图标字段兼容、图片/布局样式透传和 Slider 数值隐藏。
- 新增 `docs/archive/renderer/basic-catalog-capabilities.md`，区分 A2UI 协议合法字段与 Renderer 当前实际渲染能力，并由 Renderer 模块总领文档索引。

### Agent Runtime

- Agent Basic Catalog schema 和协议提示改为要求 `Button.action.event`，不再放行或鼓励旧版扁平 `{ name, context }`，并明确当前不生成 `action.functionCall`。
- 将 Skill 注入升级为渐进式披露：初始 Prompt 只暴露 Skill 摘要，模型可通过 `skillInfoRequest` 主动请求完整 Skill 内容。
- 新增 `getSkillContent` runtime tool call，按已启用 Skill 的 `id` 或 `name` 精确匹配并披露 Markdown 内容，不访问数据库、不读取本地路径、不执行脚本。
- 统一 Skill 内容披露与组件详情披露流程，修复模式会继续携带已披露 Skill 内容和组件详情。

### Backend / Frontend

- 后端新增 `skill:docs` 脚本，可将数据库中的 Skill 和 Reference 内容同步到 `packages/backend/skill-docs/`，作为开发期可读文档镜像。
- Skill CRUD 支持 `references` 字段，后端将其保存到 `skills.metadata.references` 并在 Agent Run、会话导出和前端 Skill 面板中透传。
- Frontend Preview 宿主补齐 `a2ui:action` / `a2ui:error` 监听，按当前会话转发 Renderer 回传消息到 Backend 记录接口。
- `AgentRunInput.enabledSkills` 增加 `description` 字段，后端触发 Agent Run 时同步传入 Skill 描述。
- `ToolCallRecord` 增加 `phase` 字段，SSE `agent_run_attempt` 会携带 `getSkillContent` 工具调用供前端展示。
- 前端工作台新增运行期 tool call 状态，对话页可显示 Skill 调用提示，Runtime 面板可查看实时或历史工具调用记录。

### 文档结构

- 重构 `docs/` 文档体系，新增 `overview`、`product`、`architecture`、`contracts`、`modules`、`tasks`、`archive` 分层。
- 将旧版重复文档按模块归档到 `docs/archive/`，仅作为历史参考，不再作为当前实现契约。
- 新增 `docs/archive/README.md`、`docs/archive/project/consolidated.md` 和 `docs/archive/project/conflicts.md`，按主题合并旧文档内容，并记录 Button action、`functionCall`、Skill 注入方式等冲突处理决策。
- 删除过时的旧任务清单、开发启动说明和阶段实施计划，当前任务只维护在 `docs/tasks/current.md`。
- A2UI 文档明确 `Button.action` 目标契约采用官网式 `action.event`，`action.functionCall` 作为未来能力进入契约；Renderer 能力矩阵同步标注当前代码仍存在扁平 action 待迁移差异。
- 重写 `docs/README.md`，明确“一个事实只有一个权威位置”的维护规则。
- 新增 `docs/modules/frontend.md`、`renderer.md`、`backend.md`、`agent.md`、`shared.md`、`integration.md`，统一记录模块功能定位、技术栈、代码工程结构和文件职责。
- 新增 `docs/contracts/api.md`、`db-schema.md`、`a2ui-v0.9.md`、`shared-types.md`，作为跨模块契约入口。
- 精简 `AGENTS.md`，移除旧文档路径、重复模块说明和过细模板，保留 AI 协作所需的入口文档、开发原则、文档维护和代码规范。

### 代码规范

- 更新 AGENTS.md 注释规范：统一中文 JSDoc 格式、文件头注释模板、方法注释要求、区块分隔线规范。
- 为 `packages/shared/src/agent.ts`、`sse.ts`、`api.ts` 补充文件头注释和字段级 JSDoc。
- 为 `packages/backend/src/app.ts`、`server.ts`、`services/session.service.ts` 补充文件头注释和方法 JSDoc。
- 为 `packages/agent/src/runtime/agent-runtime.ts`、`tools/validate-a2ui.ts` 补充文件头注释和方法 JSDoc。
- 为 `packages/frontend/src/stores/workspace.ts` 补充文件头注释和所有 action/辅助函数 JSDoc。
- 修复 `packages/agent/src/tools/catalog-schema.ts` 的两处悬空 JSDoc 注释缺陷，并补充文件头注释。

### Frontend

- 修复从“历史记录”切换会话后组件不恢复的问题：Renderer 改用显式修订号感知输入变化，不再依赖 A2UI 消息数量变化。
- 建立历史会话水合事务，使用会话 ID 与会话修订号拦截旧请求响应和旧 SSE Renderer 事件，避免快速切换时发生跨会话状态污染。
- Renderer 输入区分历史快照全量替换、实时消息增量追加和会话重置；全量重建后同步恢复 data model 订阅，实时更新不再重复回放全部历史消息。
- 历史详情恢复失败时在预览区展示明确错误，不再静默退化为空白预览。

### Backend

- 修复 Agent 提交事务内生成空 snapshot 的根因：A2UI event 回放现在复用同一个 Prisma 事务客户端，确保刚写入的 committed event 对快照计算可见。
- 新增 `pnpm --filter @a2ui-platform/backend repair:snapshots` 数据修复命令，从 committed A2UI events 重新物化 current snapshot，用于修复受旧事务可见性问题影响的历史会话。

## 2026-07-09

### Agent Runtime

- 将 Agent 组件上下文改为渐进式披露：初始 Prompt 只暴露 Basic Catalog 组件名称和一句话用途摘要，不再一次性注入全部组件字段说明。
- 新增 `componentInfoRequest` 中间输出协议，允许 LLM 结构化请求所需组件详情。
- Runtime 新增最多 3 轮组件详情披露循环，解析请求后通过 `getComponentDef()` 获取组件字段、必填项、类型和枚举值，并注入下一轮 Prompt。
- 新增 `getCatalogComponentDetails` ToolCall 记录，用于观测请求组件、跳过组件、已披露组件和本轮实际披露组件。
- 修复流程继续复用已披露组件详情，并强制输出最终 `{ assistantMessage, a2uiMessages }`，不改变 Agent 最终结果契约。

### 测试与文档

- 新增 Agent 渐进式披露单元测试，覆盖 Prompt、`componentInfoRequest` parser 和 Runtime 主路径。
- 更新 Agent 相关文档，说明新的上下文构成、组件详情披露状态机和任务验收标准。

### Frontend

- 修复实时预览可能空白的问题：`surface_snapshot` SSE 到达时同步恢复 Renderer 输入，避免仅依赖 `a2ui_messages` 事件导致预览状态丢失。
- Renderer store 新增快照恢复用的消息替换入口，避免恢复当前快照时重复累积历史消息。
- 修复 `Card.children` 非法字段漏过 Agent 校验导致卡片内容不渲染的问题；未来输出会被 `validateA2UI` 拦截并进入修复循环。
- Renderer 的 Card 增加历史数据兼容：当旧事件使用 `children` 且没有 `child` 时，仍可渲染其子组件内容。

