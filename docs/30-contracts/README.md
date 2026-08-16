# 契约

`30-contracts/` 是跨模块数据交互的最高真相源。字段、事件、消息、表结构或 DTO 只要跨模块传递，就必须维护在本目录。

## 文件索引

- [API 契约](./api.md)
- [A2UI v0.9 契约](./a2ui-v0.9.md)
- [数据库契约](./db-schema.md)
- [Shared 类型契约](./shared-types.md)

## Agent Workflow 契约状态

Agent Workflow 已落地。契约以本目录和 `docs/matt_docs/scratch/agent-workflow-capabilities/spec.md` 为准，实现细节同步在 `40-implementation/`。

阶段：

```text
plan -> generate_a2ui -> validate -> preview -> commit
```

原则：

- Agent Output 只用于 debug / audit。
- Agent Runtime 产出 Parsed Agent Result（workflow 任务由 ReAct 循环驱动，见 `40-implementation/modules/agent/`）。
- WorkflowService 只消费 Parsed Agent Result 并负责 gate / persistence。
- API 只返回稳定 DTO / SSE payload。
- 前端只消费 parsed/validated artifacts。

## 维护规则

- 未实现内容必须明确标注为 planned，不得混入当前已实现契约正文。
- 修改本目录后，同步更新受影响的 `20-design/` 和 `40-implementation/` 文档。
- 不允许在多个模块重复定义同一跨模块类型。

## Model IO Logging 契约索引

Model IO Logging 是本地开发诊断契约，当前不暴露 HTTP API、SSE 事件或数据库表。

- 开关（`MODEL_IO_LOG`、`AGENT_ROUND_DUMP`）、`traceContext` 和 JSONL 记录结构见 [Shared 类型契约](./shared-types.md#33-model-io-logging-契约)。
- 设计边界见 [Agent 模块边界](../20-design/agent/README.md#model-io-logging-设计) 与 [Backend 模块边界](../20-design/backend/README.md#model-io-logging-边界)。
- ReAct trace 与 Resource Ledger 的跨模块契约见 [Shared 类型契约](./shared-types.md) 的 3.1 / 3.2 节。
