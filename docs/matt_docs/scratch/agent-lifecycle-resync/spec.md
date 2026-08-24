# Agent Lifecycle, Interruption, and Session Resync

## Goal

Design a mature reconnect and Agent lifecycle model for A2UI workflow sessions:

- SSE reconnect restores current session state from backend facts.
- Switching sessions does not cancel backend Agent execution.
- Users can explicitly stop the current Agent run.
- A stopped workflow remains resumable from the same workflow stage.
- Agent execution cannot automatically cross User Gates.

## Core Terms

- **User Gate**: a workflow boundary that requires user action. First version gates are clarification, plan confirmation, preview confirmation, and commit confirmation.
- **Session Resync**: frontend HTTP recovery after SSE reconnect. It reloads persisted session facts and rebuilds Renderer state from current snapshot.
- **Workflow Interruption**: user or runtime stops the current AgentRun while preserving workflow context.

## Non-Goals

- Do not implement durable SSE event replay in the first version.
- Do not cancel Agent execution on session switch, refresh, or SSE disconnect.
- Do not delete artifacts when a run is interrupted.
- Do not resume the exact same in-memory executor after cancellation.

## State Model

### AgentRun

New or confirmed statuses:

```text
pending
running
committed
failed
cancelled
```

`cancelled` means this execution attempt was stopped. It does not imply the workflow is terminal.

### AgentWorkflow

Add:

```text
interrupted
```

`interrupted` remains an active workflow for the session. It blocks creation of a new workflow unless the user explicitly starts over in a future product path.

### WorkflowStep

Add:

```text
interrupted
```

The current step moves from `running` to `interrupted` when the user stops the current run. A later non-empty user message moves the same step back to `running` and creates a new AgentRun.

### Interruption Reason

First version stores reason in metadata:

```json
{
  "interruptionReason": "user_cancelled"
}
```

Allowed values:

- `user_cancelled`
- `server_restarted`
- `runtime_cancelled`
- `provider_disconnected`
- `unknown`

## User Behavior

### Session Switch

When the user switches sessions:

- Frontend closes the old SSE connection.
- Frontend clears active view state and connects the new session.
- Backend continues any running Agent for the old session.
- The old workflow may continue until it reaches a User Gate.

### Stop Running

When the user clicks stop:

- Frontend sends `POST /api/sessions/:sessionId/workflow/actions` with `{ "action": "cancel" }`.
- Backend marks the current AgentRun as `cancelled`.
- Backend marks workflow and current step as `interrupted`.
- Backend emits `workflow_interrupted`.
- Frontend immediately shows “已停止，可继续” from the HTTP response, not only from SSE.

Repeated stop on an already interrupted workflow is idempotent.

### Continue After Stop

When workflow is `interrupted` and the user sends a non-empty ordinary message:

- Backend attaches the message to the existing workflow.
- Current step moves `interrupted -> running`.
- Backend creates a new AgentRun bound to the same workflow and step.
- Agent receives the new message as continuation context.

Empty continue is out of scope for the first version.

## Reconnect Model

### Connected Event

Backend sends `connected` when SSE is established. Frontend handles it immediately and sets stream status to connected.

### Reconnect Flag

`connectStream()` should expose whether a connection is first connect or reconnect:

```ts
onConnected?: (input: { reconnect: boolean; lastEventId: string | null }) => void;
```

First connect does not trigger Session Resync because `setActiveSessionId()` already loads the session.

Reconnect triggers Session Resync.

### Session Resync Scope

First version reloads:

- messages
- workflows
- agent runs
- A2UI events
- surface snapshots
- session detail

Session detail recovery restores Renderer from `currentSnapshot`.

### Resync Concurrency

Frontend uses:

- active session ID
- `_sessionRevision`
- a resync in-flight token

Only the latest resync for the current session revision may write state.

If SSE is connected but Session Resync fails, keep `streamStatus = connected`, set session sync status to error, and preserve the old UI state.

## Backend Cancellation Checks

Use both:

- in-memory cancellation token for the running process
- database status as the durable fact source

Safe check points:

- before `runtime.runWorkflowTask()`
- after `runtime.runWorkflowTask()` returns
- before persisting trace/status messages
- before creating artifacts
- before advancing to the next workflow step
- before `commitExactCandidate()` enters the transaction

Once the commit transaction starts, it should finish atomically.

## Backend Restart Repair

On backend startup, orphan `running` workflow work should be repaired:

- running AgentRun -> `cancelled`
- related workflow -> `interrupted`
- related current step -> `interrupted`
- interruption reason -> `server_restarted`

No automatic resume on startup.

## API Contract Changes

- Add `interrupted` to `AgentWorkflowStatus`.
- Add `interrupted` to `WorkflowStepStatus`.
- Keep WorkflowAction `cancel`.
- `cancel` response includes latest workflow and cancelled agentRun; if possible include step in the response shape.
- `POST /messages` resumes `interrupted` workflow with non-empty ordinary input.

## SSE Contract Changes

Add:

- `connected`
- `workflow_interrupted`

Do not require Last-Event-ID replay in the first version.

## Frontend UI Rules

- `interrupted` does not count as generating.
- Show a distinct “已停止，可继续” state.
- Input remains enabled.
- User’s next non-empty message continues the interrupted workflow.
- Renderer keeps the last committed current snapshot.
- Cancel does not roll back, clear, or mutate committed Renderer state.

## Testing Matrix

Backend:

- `cancel` on running workflow interrupts workflow, step, and AgentRun.
- repeated `cancel` on interrupted workflow is idempotent.
- `cancel` on completed workflow is rejected.
- ordinary message resumes interrupted workflow on the same step with a new AgentRun.
- commit checks cancellation before entering the transaction.
- startup repair marks orphan running work as interrupted.

Frontend:

- handles `connected` immediately.
- first connect does not trigger Session Resync.
- reconnect triggers full Session Resync.
- stale resync result cannot write after session switch.
- interrupted workflow stops generating UI and leaves input enabled.
- Session Resync failure preserves old UI and reports sync error.

Integration:

- switch session while Agent runs; old workflow continues to User Gate.
- disconnect during completion; reconnect resync restores messages, workflow, snapshot.
- stop run; send follow-up; workflow continues original step.
