# 旧文档冲突与处理决策

本文档记录归档资料中与当前实现、当前契约或产品方向冲突的内容。状态为“已裁决”的条目按本文件结论处理；状态为“待实现”的条目表示文档方向已明确，但代码仍需后续迁移。

## 1. Button action 格式

状态：已裁决，待代码迁移。

冲突来源：

- `renderer/a2ui-protocol-notes.md` 中存在官网式结构：`action.event` 与 `action.functionCall`。
- `renderer/implementation.md` 和当前部分代码使用早期扁平结构：`{ "name": "...", "context": {} }`。

处理决策：

- 新文档口径按官网式结构：`Button.action.event`。
- 不采用扁平结构作为正式契约。
- 当前任务只整理文档，不修改代码；因此代码中扁平结构属于待迁移实现差异。

## 2. functionCall 是否进入当前 A2UI 契约

状态：已裁决，未来实现。

冲突来源：

- 旧协议认知文档将 `functionCall` 作为 Actions 的一种。
- 当前 Renderer/Agent 尚未实现 `functionCall` 执行和生成约束。

处理决策：

- `action.functionCall` 进入 A2UI 契约，作为未来能力保留。
- 当前 Renderer 暂不执行。
- 当前 Agent 暂不主动生成。
- 后续实现前，需要补齐 shared 类型、Agent schema、validateA2UI、Renderer 执行策略、Frontend/Backend 安全边界和测试。

## 3. Agent Skill 注入方式

状态：已裁决，以当前实现为准。

冲突来源：

- 旧 Agent/Product/Integration 文档描述“已启用 skills 进入 Agent 上下文”时，容易被理解为完整 Skill 内容一次性注入初始 Prompt。
- 当前实现已升级为 Skill 渐进式披露。

处理决策：

- 当前口径为渐进式披露：初始 Prompt 只暴露 Skill 摘要，模型通过 `skillInfoRequest` 按需请求完整内容。
- Runtime 只从本次 `AgentRunInput.enabledSkills` 匹配 Skill，不访问数据库、不读取本地文件、不执行脚本。
- 旧文档中“全量 Skill 注入初始 Prompt”的描述废弃。

## 4. Renderer action 回传是否已完整接入 Frontend

状态：待核实或待实现。

冲突来源：

- 旧集成文档描述 Frontend 监听 `a2ui:action` 后调用 `recordAction`。
- 当前模块文档也保留了“Frontend 转发 Renderer action/error”的目标职责。
- 当前代码是否已经完整接入，需要以实际实现为准单独核查；本次文档整理不修改代码。

处理建议：

- 若代码已接入：补充 Frontend/Integration 文档中的具体入口和验收测试。
- 若代码未接入：在 `docs/tasks/current.md` 中登记为待办，避免文档声称已实现。

## 5. 旧任务清单、启动说明与当前任务来源

状态：已裁决。

冲突来源：

- 旧资料中存在多个模块任务清单、开发启动说明和阶段实施计划。
- 当前 AGENTS 规则要求当前任务状态只维护在 `docs/tasks/current.md`。

处理决策：

- 旧任务清单、开发启动说明和过时阶段实施计划不再归档。
- 不再从旧任务清单或旧实施计划派生当前工作状态。
- 如需恢复某项任务，先迁移到 `docs/tasks/current.md`。

