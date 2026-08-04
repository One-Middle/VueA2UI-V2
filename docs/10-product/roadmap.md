# 产品路线图

## 1. 当前阶段

当前阶段目标是完成单用户 MVP 的稳定闭环：

- 前端工作台可创建会话、发送需求、查看预览和历史。
- 后端可保存消息、Agent run、A2UI events 和 snapshots。
- Agent 可生成、校验并修复 A2UI v0.9 消息。
- Renderer 可稳定渲染 Basic Catalog，并回传 action/error。

## 2. 实施阶段

### 阶段 0：共享类型契约

- 明确 A2UI、API、SSE、Agent result 类型。
- 所有跨模块 DTO 优先放入 `packages/shared`。

### 阶段 1：Renderer 最小闭环

- 实现 surface、component、data model。
- 支持 `createSurface`、`updateComponents`、`updateDataModel`、`deleteSurface`。
- 覆盖 Basic Catalog MVP 组件。

### 阶段 2：Backend 基础 API

- 完成会话、消息、文件、skills、events、snapshots、runtime logs API。
- 完成 Prisma schema 和提交事务。
- 完成 SSE 推送。

### 阶段 3：Frontend 工作台

- 完成创作工作台、历史记录、Skills、导入导出和 Runtime。
- 接入 Renderer、HTTP API 和 SSE。
- 支持历史 snapshot 水合。

### 阶段 4：Agent Runtime

- 完成上下文构建、Prompt 拼装、模型调用、输出解析、校验和修复循环。
- 完成组件信息渐进式披露。

### 阶段 5：跨模块集成

- 跑通真实 Agent 成功链路。
- 跑通失败链路。
- 完成文件、skill、Renderer action、导出链路联调。

## 3. 后续演进

- 多用户与权限。
- Catalog 版本管理。
- 更丰富的模板和评估集。
- 更细粒度的 Agent 可观测性。
- 更完整的导入能力。

