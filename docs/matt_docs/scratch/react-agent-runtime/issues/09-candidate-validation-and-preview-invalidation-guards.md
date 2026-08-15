# 09 - Candidate validation and preview invalidation guards

**构建内容：** 补齐 candidate 强制校验和 preview 修改 plan 后旧 candidate 失效的双重 guard。

**阻塞关系：** 08 - runWorkflowTask migration.

**Status:** planned

## Scope

- AgentExecutor candidate final draft 必须强制 `validateA2UI`。
- WorkflowService 保存 candidate artifact 前再次 gate validation。
- preview 阶段用户修改 plan 时，保留旧 candidate / validation artifacts，但标记旧 candidate 不可 commit。
- `submitDecision()` 早期校验 candidate 是否属于 latest confirmed plan。
- `commitExactCandidate()` 最终校验 candidate 是否属于 latest confirmed plan。

## Acceptance Criteria

- [ ] 未通过 validate 的 candidate 不会保存为 `candidate_a2ui_messages` artifact。
- [ ] preview revise to plan 后旧 candidate 仍在历史中可查看。
- [ ] preview revise to plan 后旧 candidate 不允许 commit。
- [ ] commit 阶段不会重新调用 Agent。
- [ ] commit 使用 exact stored candidate。

## Out Of Scope

- 不实现前端旧 candidate 标识 UI。
- 不新增 candidate 表。

