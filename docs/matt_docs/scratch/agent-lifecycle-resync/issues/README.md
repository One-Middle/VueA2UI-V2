# Agent Lifecycle Resync Issues

This directory breaks the Agent lifecycle, interruption, and Session Resync implementation into small planned issues.

## Order

1. [Shared lifecycle and SSE contract](./01-shared-lifecycle-and-sse-contract.md)
2. [Frontend stream connected lifecycle](./02-frontend-stream-connected-lifecycle.md)
3. [Frontend Session Resync store support](./03-frontend-session-resync-store-support.md)
4. [Backend interrupted workflow contract](./04-backend-interrupted-workflow-contract.md)
5. [Resume interrupted workflow from message](./05-resume-interrupted-workflow-from-message.md)
6. [Cancellation token registry and safe checks](./06-cancellation-token-registry-and-safe-checks.md)
7. [Startup repair for orphan running work](./07-startup-repair-for-orphan-running-work.md)
8. [Lifecycle tests and documentation sync](./08-lifecycle-tests-and-documentation-sync.md)

## Scope Guard

- Do not implement durable Last-Event-ID event replay in the first version.
- Do not cancel Agent execution on session switch, refresh, or SSE disconnect.
- Do not delete workflow artifacts when interrupting a run.
- Do not resume the same in-memory executor after cancellation.
- Do not make `interrupted` a terminal workflow state.
