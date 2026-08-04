# AGENTS.md Documentation Governance Snippet

```md
## 文档治理规则

项目文档按用途分层维护：

- `docs/00-governance/`：文档系统治理真相源。
- `docs/10-product/`：产品真相源。可以描述未来能力，但必须标注状态。
- `docs/20-design/`：设计真相源。可以描述目标架构，但必须标注实现状态。
- `docs/30-contracts/`：跨模块数据交互最高真相源。API、DB、事件、A2UI、Shared Types 以这里为准。
- `docs/40-implementation/`：当前真实实现真相源。必须严格基于源码，不写推测或未落地能力。
- `docs/50-delivery/`：功能新增、功能修改、重构、修复的任务期工作区。
- `docs/90-notes/`：学习、解释、调研、AI 生成辅助材料和历史归档，不作为开发或验收依据。

修改代码时：

- 改变真实实现，必须同步 `docs/40-implementation/`。
- 改变跨模块字段、接口、事件、消息或数据结构，必须同步 `docs/30-contracts/`。
- 改变长期产品目标或用户能力，才同步 `docs/10-product/`。
- 改变长期架构或模块目标职责，才同步 `docs/20-design/`。
- 较大的功能新增、功能修改、重构或修复，应在 `docs/50-delivery/planning/` 下创建或更新任务目录。
- 不以 `docs/90-notes/` 判断当前行为。
```
