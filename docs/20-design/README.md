# 设计

`20-design/` 维护长期模块职责、边界和跨模块协作方式，帮助开发者和 Agent 在动手前理解“每个模块负责什么、不负责什么、与谁交互”。

## 文件索引

- [Agent](./agent/README.md)
- [Backend](./backend/README.md)
- [Frontend](./frontend/README.md)
- [Renderer](./renderer/README.md)

`packages/shared` 和端到端链路不是独立设计子系统，边界说明见下方。

## 共享类型层：`packages/shared`

定位：跨模块类型和契约承载层。

负责：

- API DTO。
- SSE event 类型。
- Agent Runtime 输入、工具调用和 Parsed Agent Result 类型。
- A2UI message 类型。
- 其他需要跨模块共享的 TypeScript 类型。

不负责：

- 业务流程实现。
- 运行时副作用。
- UI 渲染。
- 数据库访问。

边界：

- 可被 frontend、renderer、backend、agent 依赖。
- 不依赖任何业务模块。
- 类型变化必须同步 `../30-contracts/`。

## Agent Workflow 协作边界

目标 workflow 阶段为：

```text
plan -> generate_a2ui -> validate -> preview -> commit
```

职责拆分：

- Agent 负责理解用户输入、生成 clarification form、Markdown plan、candidate A2UI，并在关键环节通过工具请求用户决策。
- Agent Runtime 负责执行模型、暴露受控 AgentTool、解析 Agent Output，并产出 Parsed Agent Result。
- WorkflowService 负责当前阶段 gate、可见工具、状态推进、持久化 artifact、失败和重试。
- API 只返回稳定 DTO / SSE payload，不暴露 raw Agent Output 给前端主流程。
- Frontend 只渲染 parsed/validated artifact 和稳定 DTO。

关键边界：

- `askClarification` 和 `askUserDecision` 是 AgentTool，不是 HTTP API。
- `submit_clarification` 和 `submit_decision` 是 WorkflowAction，不是 AgentTool。
- raw Agent Output 只能进入 debug metadata 摘要，例如 `rawOutputPreview`。
- `workflow_artifacts` 只保存 parsed/validated 后的稳定产物。

## 端到端链路：Integration

定位：端到端链路边界，不是独立 package。

负责说明：

- 用户输入如何经过 frontend、backend、agent、shared、renderer。
- Agent Workflow 如何串联 message、agent run、tool call、artifact、A2UI event 和 surface snapshot。
- SSE 如何同步 workflow 进度、artifact 和失败状态。

不负责：

- 替代任何单模块实现说明。
- 定义 API、DB 或 A2UI 字段细节。

## 维护规则

- 当模块长期职责、边界或上下游关系变化时，更新对应模块 README。
- 当前实现细节变化进入 `../40-implementation/`。
- 跨模块数据形状变化进入 `../30-contracts/`。
- 任务推进、spec、tickets 或 handoff 进入 `../matt_docs/`。
