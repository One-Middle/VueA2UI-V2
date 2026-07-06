# A2UI Agent 平台全模块实施计划 v0.1

## 1. 执行概要

基于已完成的 17 份产品/设计/任务文档和现有代码骨架分析，将全部 5 个模块（shared、renderer、backend、frontend、agent）和跨模块集成任务按推荐顺序分阶段实施。每个阶段由一个独立 coding agent 负责，完成后将实现细节写入对应文档。

## 2. 当前项目状态

| 模块 | 当前状态 | 待实现 |
|------|---------|--------|
| `packages/shared` | 完整类型定义 | 少量补充（CRUD DTO、catalog 类型） |
| `packages/renderer` | 仅 stub（MessageProcessor + A2uiSurface 壳） | 10 个 REN 任务 |
| `packages/backend` | Express 基础 + Prisma schema | 12 个 BE 任务 |
| `packages/frontend` | Naive UI 工作台布局壳 + Pinia | 10 个 FE 任务 |
| `packages/agent` | echo stub（AgentRuntime + validateA2UI） | 9 个 AG 任务 |
| 集成 | 无 | 8 个 INT 任务 |

## 3. 实施阶段

### 阶段 0：共享类型契约（基础层）

**Agent 1 - Shared 类型完善**

完善 `packages/shared` 中缺失的 CRUD request/response 类型、Catalog schema 类型和 SSE phase 枚举。所有模块依赖此包，类型变更必须先完成。

输出文档：`docs/shared/shared-types-spec.md`

### 阶段 1：Renderer 最小闭环

**Agent 2 - Renderer 核心实现**

实现 10 个 REN 任务：
1. DataModel（JSON Pointer 读写/订阅/路径自动创建）
2. SurfaceModel + ComponentModel（component map 管理、类型变化重建）
3. MessageProcessor（4 类消息 → 模型更新）
4. DataContext + ComponentContext（动态值解析、basePath、setter、buildChild、action 派发）
5. Vue 渲染入口（A2uiSurface + A2uiComponent 递归渲染）
6. 最小 Basic Catalog（Text、Row、Column、Button、TextField）
7. Fallback 与错误派发（missing child、unknown component）
8. 动态列表（`children: { path, componentId }`、正确 basePath）
9. 完整 Basic Catalog（Image、Icon、Video、AudioPlayer、Divider、List、Card、Tabs、Modal、CheckBox、ChoicePicker、Slider、DateTimeInput）

输出文档：`docs/renderer/renderer-implementation-details.md`

### 阶段 2：Backend 基础 API

**Agent 3 - Backend 实现**

实现 12 个 BE 任务：
1. 路由骨架与统一错误处理
2. Prisma migrations + 数据库连接
3. Repository 层（所有 10 张表 CRUD）
4. Session API（创建/列表/详情/更新）
5. Message API + Agent run 创建（mock agent 返回固定 A2UI 消息）
6. SSE StreamService（心跳 + 6 类业务事件）
7. Agent run 编排（成功提交事务、失败记录）
8. SurfaceSnapshotService（增量计算 snapshot）
9. File API（multer + .txt 校验）
10. Skills API + session_skills 管理
11. Renderer event API（action/error 记录）
12. Export API（会话/JSONL/snapshot 导出）

输出文档：`docs/backend/backend-implementation-details.md`

### 阶段 3：Frontend 工作台

**Agent 4 - Frontend 实现**

实现 10 个 FE 任务：
1. API 客户端封装（services/api.ts）
2. 会话状态管理（扩展 Pinia）
3. 对话消息列表与输入（features/conversation/）
4. SSE 客户端（services/stream.ts）
5. Renderer 预览集成（features/preview/）
6. 文件上传界面
7. Skills 管理界面
8. Runtime 日志面板
9. 历史面板
10. 导入导出入口

输出文档：`docs/frontend/frontend-implementation-details.md`

### 阶段 4：Agent Runtime

**Agent 5 - Agent Runtime 实现**

实现 9 个 AG 任务：
1. ContextBuilder（组装用户输入、消息、snapshot、文件、skills、Catalog 摘要）
2. PromptComposer（初始 prompt + repair prompt，含输出契约和 Catalog 限制）
3. ModelClient（OpenAI-compatible API 非流式调用）
4. 模型输出解析器（JSON envelope 解析和基本结构校验）
5. validateA2UI（完整 Ajv + Catalog Schema + root/child 引用检查 + 安全约束）
6. Runtime 状态机（PREPARE_CONTEXT → GENERATE_DRAFT → VALIDATE_DRAFT → REPAIR_DRAFT → COMMIT/FAILED）
7. Tool call 记录回调
8. 失败结果规范化

输出文档：`docs/agent/agent-runtime-implementation-details.md`

### 阶段 5：跨模块集成

**Agent 6 - Integration**

实现 8 个 INT 任务：
1. Mock A2UI 端到端链路验证
2. 真实 Agent 成功链路
3. 真实 Agent 失败链路
4. 文件进入 Agent 上下文
5. Skill 进入 Agent 上下文
6. Renderer action 回传
7. 导出链路
8. 端到端测试

输出文档：`docs/integration/integration-implementation-details.md`

## 4. 实施原则

- 先 mock 后真实模型
- 先最小闭环后补齐组件
- 先共享类型后并行模块
- 后端只提交通过 validateA2UI 的 A2UI 消息
- Renderer 只接收已校验消息
- Agent 不生成任意 HTML/JS/CSS
- 所有项目文档使用中文

## 5. 验证方式

- `pnpm typecheck` 全量通过
- 各模块 Vitest 单元测试覆盖核心路径
- Mock 端到端链路：用户消息 → SSE → Renderer 渲染
- Agent 校验修复循环：3 次 attempt → FAILED / COMMITTED
