# 09 - Retry and failure handling

**构建内容：** 为 Agent Runtime failure、parse failure、gate violation、validate failure 和 failed step retry 提供一致的失败记录、用户展示和重试路径。

**阻塞关系：** 03 - Plan stage state machine, 05 - Generate and validate split.

**Status:** resolved

## Scope

- Agent Runtime 抛错或返回 failure 时，当前 step 标记 failed。
- 解析失败和 gate violation 都作为 workflow step failure 记录。
- 失败原因通过 API/SSE 可见。
- `retry_step` 重新运行真实 Agent Runtime。
- retry 不生成后端模板 fallback。
- retry 保留历史 failed step 和 artifacts。

## Acceptance Criteria

- [x] Runtime failure 不生成假 clarification、假 plan 或假 candidate。
- [x] parse failure 标记 step failed，并保留 debug metadata 摘要。
- [x] gate violation 标记 step failed 或返回稳定错误，不能绕过 gate。
- [x] validate failure 写 `validation_report`，不写 `candidate_a2ui_messages`。
- [x] `retry_step` 会创建新的 attempt/step 或更新可重试状态，并重新调用真实 Runtime。
- [x] retry 后 timeline 能看到失败历史和新 run。
- [x] cancel 能让 active workflow 进入终止态，释放 session active workflow 约束。

## Out Of Scope

- 不实现完整测试矩阵。
- 不实现复杂人工编辑 artifact。
