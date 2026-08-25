# Agent lifecycle uses interruptible workflows and session resync

Status: Accepted

We will keep Agent execution independent from the frontend SSE connection, model user stop as an interruptible workflow state, and recover disconnect gaps through Session Resync instead of first-version SSE event replay. This keeps long-running Agent work recoverable across session switches while still giving users an explicit stop action.

## Context

SSE can disconnect because of network loss, browser sleep, refresh, or session switching. Treating disconnect as cancellation would make ordinary navigation destructive. Treating SSE as the source of truth would also require event replay before the product can reliably recover missed workflow state.

The workflow system already persists messages, workflow steps, workflow artifacts, agent runs, A2UI events, and current surface snapshots. These persisted records are the correct recovery source for user-visible state.

## Decision

- Frontend disconnect, refresh, and session switching do not cancel backend Agent execution.
- User `cancel` remains the WorkflowAction name, but its result is a resumable `interrupted` workflow, not a terminal cancelled workflow.
- Cancelling a running workflow sets the current AgentRun to `cancelled`, the current workflow to `interrupted`, and the current step to `interrupted`.
- An interrupted workflow remains the active workflow for the session. A later non-empty user message resumes the same workflow step by creating a new AgentRun.
- Agent execution must stop at User Gates and must not automatically cross clarification, plan confirmation, preview confirmation, or commit confirmation boundaries.
- SSE reconnect success triggers Session Resync. The frontend reloads messages, workflows, agent runs, A2UI events, snapshots, and session detail from HTTP APIs.
- The first version does not require Last-Event-ID based event replay. SSE remains a realtime notification channel, not the business fact source.

## Considered Options

- Cancel Agent whenever the user switches sessions. This makes navigation destructive and couples UI focus to backend work.
- Make `cancel` terminal for the whole workflow. This prevents the user from stopping a bad run and continuing the same workflow phase with extra input.
- Implement durable SSE event replay first. This improves realtime trace completeness, but adds event log retention, ordering, replay, and expiry complexity before the core recovery model is stable.
- Use only database polling after disconnect. This is reliable but gives up the existing realtime SSE experience.

## Consequences

- Frontend must distinguish connection state from session synchronization state.
- Backend must support cancellation tokens and database status checks around safe execution points.
- `interrupted` becomes a first-class workflow and step status.
- Orphan running work after backend restart should be marked `interrupted` with an interruption reason.
- Runtime trace events may still be incomplete across disconnects in the first version; user-visible workflow state is recovered from persisted facts.
