# 08 - Lifecycle tests and documentation sync

**构建内容：** 为可中断 workflow 和 Session Resync 补齐测试，并在实现后同步设计、契约和实现文档。

**阻塞关系：** 依赖 01-07。

**Status:** planned

## Scope

- Backend service tests:
  - running cancel -> interrupted workflow/step + cancelled AgentRun。
  - repeated cancel idempotent。
  - completed workflow cancel rejected。
  - interrupted ordinary message resume same step with new AgentRun。
  - startup repair orphan running work。
- Frontend store/stream tests:
  - connected event immediately sets connected lifecycle。
  - first connect does not Session Resync。
  - reconnect triggers full Session Resync。
  - stale session/revision resync ignored。
  - interrupted workflow not generating and input remains enabled。
  - resync failure preserves old UI。
- Update implementation docs under `docs/40-implementation/modules/*` after code changes.
- Update `docs/CHANGELOG.md` after implementation.

## Acceptance Criteria

- [ ] Backend lifecycle tests pass.
- [ ] Frontend stream/store tests pass.
- [ ] Typecheck passes for touched packages.
- [ ] Design, contracts, scratch spec, implementation docs, and changelog agree on `interrupted` semantics.
- [ ] No documentation still describes `cancel` as terminal workflow cancellation for the main workflow path.

## Out Of Scope

- 不新增 browser visual QA，除非 UI 变更明显影响布局。
- 不新增 durable SSE replay 测试。
