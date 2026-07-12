# 当前任务清单

## 1. 文档整理

- [x] 建立新的 `overview / product / architecture / contracts / modules / tasks / archive` 文档结构。
- [x] 将旧文档按模块归档到 `docs/archive/`。
- [x] 将 `docs/archive/` 中重复内容合并到 `project/consolidated.md`，并建立 `project/conflicts.md` 冲突决策表。
- [x] 重写 `docs/README.md`，明确权威来源规则。
- [x] 合并产品、架构、契约和模块文档入口。
- [ ] 后续如需要，逐步把归档文档中的详细字段补回 `contracts/api.md` 和 `contracts/db-schema.md`。

## 2. 代码任务

- [ ] 将 Button action 代码实现从历史扁平 `{ name, context }` 迁移到契约目标 `action.event`，同步 shared 类型、Agent schema、validateA2UI、Renderer 和测试。
- [ ] 设计并实现 `action.functionCall` 的执行边界、安全策略和端到端测试；实现前 Agent 不主动生成。
- [ ] 核实 Renderer action/error 是否已由 Frontend 完整转发到 Backend；若未接入，补齐监听、API 调用和测试。

其他代码任务以仓库 issue 或后续开发指令为准。若新增模块任务，应在这里按模块分区维护，不再分散到各模块目录的 `tasks.md`。

## 3. 任务维护规则

- 只记录当前仍需执行或确认的任务。
- 已完成的长期任务可以移动到变更日志，不需要在多个模块文档中重复维护。
- 跨模块任务应写清涉及的契约文档和模块文档。
