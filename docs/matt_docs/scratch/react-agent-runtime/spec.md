# ReAct Agent Runtime

## Goal

Replace the current split Agent Runtime workflow paths with a workflow-driven ReAct Agent execution model.

The platform should keep the existing product flow as much as possible:

- WorkflowService remains the owner of Workflow state, persistence, SSE, artifacts, retries, and A2UI commit.
- Agent execution becomes a controlled single-step task runner driven by WorkflowService.
- The Agent can loop over model actions, tools, observations, validation failures, and repair attempts inside one AgentRun.
- The Agent cannot directly write the database, send SSE, commit A2UI, or bypass user confirmation.

## Problem

The current runtime has two conceptual paths:

- `run()` performs a direct generation / validation / commit-shaped run.
- `runWorkflowTask()` performs a workflow-scoped task and returns a parsed workflow result.

Workflow is now the required product design, so keeping a direct non-workflow runtime path creates duplicated contracts and unclear responsibility. The new runtime should treat Workflow as the only UI generation flow and make AgentRun a controlled ReAct execution unit for one workflow transition.

## Core Decisions

### Naming

The persisted DB entity remains `AgentRun`.

The code execution object should be named `AgentExecutor` or `WorkflowAgentExecutor`, not `AgentRun`, to avoid mixing the persisted audit record with the in-memory executor.

### Type ownership

- Frontend / backend visible trace DTOs live in `packages/shared`.
- Runtime-only loop types live in `packages/agent/src/runtime/react-agent-types.ts`.
- Executor internals are not exposed to the frontend.

### Workflow ownership

WorkflowService controls:

- AgentRun record creation and completion.
- WorkflowStep status and stageState.
- WorkflowArtifact persistence.
- ToolCall persistence.
- SSE emission.
- Candidate invalidation.
- Exact candidate commit.

AgentExecutor controls:

- ReAct while loop.
- Model calls.
- Model action parsing.
- Tool execution through an injected ToolRegistry.
- Observations.
- Current draft repair loop.
- Final draft normalization and validation.

AgentExecutor must not:

- Read or write the database.
- Send SSE directly.
- Save artifacts.
- Update WorkflowStep.
- Create A2UI events or snapshots.
- Commit A2UI.
- Skip user confirmation.

## Runtime Module Shape

New files:

```text
packages/agent/src/runtime/
  react-agent-types.ts
  react-action-parser.ts
  react-prompt-composer.ts
  tool-registry.ts
  workflow-agent-executor.ts
  workflow-agent-context-builder.ts
```

Responsibilities:

- `react-agent-types.ts`: runtime-only ReAct loop contracts.
- `react-action-parser.ts`: strict JSON envelope parser for LLM output.
- `react-prompt-composer.ts`: renders system and user prompts from working context.
- `tool-registry.ts`: executes injected, allowed tools and returns observations or final artifacts.
- `workflow-agent-executor.ts`: owns the while loop and final result.
- `workflow-agent-context-builder.ts`: builds goal, facts, capabilities, and currentDraft from WorkflowService-owned data.

## Shared DTO Additions

Add `AgentTraceEventDto` for realtime SSE and `AgentRunTraceSummaryDto` for API recovery.

```ts
export interface AgentTraceEventDto {
  sessionId: string;
  agentRunId: string;
  workflowId: string | null;
  workflowStepId: string | null;
  iterationIndex: number;
  type:
    | "iteration_started"
    | "model_action"
    | "tool_call"
    | "observation"
    | "final_validation";
  reasoningSummary?: string;
  actionType?: "tool_call" | "final_draft" | "give_up";
  toolName?: string;
  finalKind?: string;
  summary?: JsonObject;
  createdAt: string;
}

export interface AgentRunTraceSummaryDto {
  iterations: Array<{
    index: number;
    reasoningSummary?: string;
    actionType?: "tool_call" | "final_draft" | "give_up";
    toolName?: string;
    finalKind?: string;
    observationSummary?: JsonObject;
    finalValidation?: JsonObject;
    durationMs: number;
  }>;
}
```

`AgentRunDetailResponse` should add:

```ts
traceSummary: AgentRunTraceSummaryDto | null;
```

`AgentRunDto` should not add metadata in the first version. List responses stay lightweight.

`ServerSentEventName` / `PlatformSseEvent` should add a new event:

```ts
event: "agent_trace_event";
data: AgentTraceEventDto;
```

## Agent Model Action Protocol

Every LLM response in the ReAct loop must be exactly one JSON object matching `AgentModelAction`.

The LLM must not output observations. Observations are system facts produced by parser, validator, or ToolRegistry.

```ts
type AgentModelAction =
  | {
      type: "tool_call";
      reasoningSummary: string;
      tool: AgentToolName;
      arguments: JsonObject;
    }
  | {
      type: "final_draft";
      reasoningSummary: string;
      finalKind: AgentFinalKind;
      draft: JsonObject;
    }
  | {
      type: "give_up";
      reasoningSummary: string;
      reason: string;
      recoverable: boolean;
      details?: JsonObject;
    };
```

Rules:

- Each iteration allows at most one tool call.
- `reasoningSummary` is a concise audit summary, not hidden chain-of-thought.
- Non-JSON output or schema-invalid JSON becomes a system observation and the loop continues until limits are reached.
- Old markdown / tool-call text formats are not accepted by the new executor.

## Working Context

The executor receives a structured context:

```ts
interface ReactAgentRunInput {
  runId: string;
  sessionId: string;
  workflowId: string;
  workflowStepId: string;
  goal: AgentRunGoal;
  facts: AgentRunFact[];
  currentDraft?: AgentDraft | null;
  capabilities: AgentCapabilities;
  limits: AgentRunLimits;
}
```

Facts are the workflow ledger projected into the current task, for example:

- original user request
- current snapshot
- enabled skill summaries
- uploaded files
- clarification answers
- confirmed plan
- revision feedback
- candidate A2UI
- validation report

The first version sends the full `goal + facts + observations + currentDraft + capabilities` to the model each iteration. Context compression is reserved for a later version.

## Final Artifacts

AgentExecutor returns completed or failed. There is no suspended AgentRun state.

Waiting for user input is represented by a final artifact plus WorkflowStep awaiting state, not by an in-memory executor pause.

```ts
type ReactAgentRunResult =
  | {
      status: "completed";
      final: AgentFinalArtifact;
      trace: AgentRunTraceSummary;
      usage?: JsonObject;
    }
  | {
      status: "failed";
      failure: {
        reason: string;
        recoverable: boolean;
        details?: JsonObject;
      };
      trace: AgentRunTraceSummary;
      usage?: JsonObject;
    };
```

Final artifact kinds:

- `clarification_form`
- `decision_form`
- `plan_markdown`
- `candidate_a2ui_messages`

`plan_markdown` can carry a companion `decision_form`. WorkflowService saves them as two WorkflowArtifacts.

AgentExecutor final output describes only artifacts. It does not recommend WorkflowStep status, stageState, or next transition.

## ToolRegistry

ToolRegistry is injected into the executor for testability and workflow gate control.

First-version tools:

- `getSkillContent`
- `getSkillReferenceContent`
- `getCatalogComponentDetails`
- `validateA2UI`
- `askClarification`
- `askUserDecision`

Tool result shape:

```ts
type ToolExecutionResult =
  | {
      status: "completed";
      observation: AgentObservation;
    }
  | {
      status: "failed";
      observation: AgentObservation;
      recoverable: boolean;
    }
  | {
      status: "final_artifact";
      artifact: AgentFinalArtifact;
    };
```

Rules:

- `askClarification` and `askUserDecision` remain `tool_call` actions in the model protocol.
- They are artifact-producing tools and return `final_artifact`.
- Once either returns `final_artifact`, AgentExecutor returns `completed`.
- `validateA2UI` is both a normal tool and a forced final validator for candidate A2UI.
- Each tool declares a failure policy.
- Tool failures may become observations and continue the loop when recoverable.

## ReAct Loop

```text
while iteration < maxIterations:
  compose prompt(goal + facts + observations + currentDraft + capabilities)
  call model
  parse AgentModelAction

  if parse failed:
    append system observation
    emit agent_trace_event(observation)
    continue

  emit agent_trace_event(model_action)

  if action is tool_call:
    execute ToolRegistry
    record ToolCall when applicable
    emit agent_trace_event(tool_call)

    if result.status is completed:
      append tool observation
      emit agent_trace_event(observation)
      continue

    if result.status is failed and recoverable:
      append tool observation
      emit agent_trace_event(observation)
      continue

    if result.status is failed and not recoverable:
      return failed

    if result.status is final_artifact:
      return completed(final artifact)

  if action is final_draft:
    normalize and validate against goal.expectedResult

    if finalKind mismatches goal.expectedResult:
      append final_validation_failed observation
      currentDraft = draft
      continue

    if finalKind is candidate_a2ui_messages:
      force validateA2UI

    if final validation passes:
      return completed(final artifact)

    append final_validation_failed observation
    currentDraft = draft
    continue

  if action is give_up:
    return failed
```

If the loop reaches max iterations, return failed. WorkflowService marks the step failed_retryable and waits for explicit user retry.

## Prompt Contract

System prompt should be a stable contract covering:

- identity and mission
- authority boundaries
- workflow contract
- ReAct loop contract
- JSON output protocol
- tool use policy
- final draft quality gates
- A2UI protocol constraints
- recovery and repair rules
- context priority rules

User prompt should be generated from structured context each iteration:

- goal
- facts
- observations
- currentDraft
- capabilities
- required output reminders

The system prompt should not include large workflow facts. Facts belong in the user prompt.

## Validation

AgentExecutor validates final drafts internally to enable self-repair.

WorkflowService also validates final results as the final gate before persistence and transition.

Examples:

- `plan_markdown` must include required headings.
- `decision_form` must include `confirm`, `revise`, and `reject`.
- `clarification_form` must include non-empty fields.
- `candidate_a2ui_messages` must pass forced `validateA2UI`.

`validateA2UI` failure is fed back as an observation until the loop limit is reached.

## Logging And Trace

Reuse existing logging infrastructure.

Keep:

- backend `pino` logger for service lifecycle and errors
- agent package console logger for local agent messages
- `MODEL_IO_LOG=off|summary|debug|full` for model IO diagnosis
- `tool_calls` table for tool audit
- existing `agent_run_attempt` for backward-compatible tool call progress

Add:

- SSE event `agent_trace_event`
- `AgentTraceEventDto`
- `AgentRunTraceSummaryDto`
- `agent_runs.metadata.traceSummary`
- frontend store `runtimeTraceEvents: AgentTraceEventDto[]`

Rules:

- `reasoningSummary` is written to both `tool_calls.inputSummary.reasoningSummary` and `traceSummary.iterations`.
- Raw trace events are not persisted one by one.
- Trace summary is accumulated in memory and written to `agent_runs.metadata.traceSummary` once the run ends.
- `GET agent-run detail` returns `traceSummary`.
- First version stores trace events in the frontend store but does not add new UI.
- Production should disable `MODEL_IO_LOG=full`; production may allow summary/debug summaries only.

## Frontend Recovery

SSE is not the source of truth.

Recovery sources:

- Workflow UI recovers from `GET /sessions/:sessionId/workflows` or session detail workflows.
- Agent trace recovery comes from `GET /sessions/:sessionId/agent-runs/:runId`.
- Tool calls come from existing AgentRun detail.

If the frontend disconnects while a clarification or decision form is visible, it should show the same form after reload because the form is persisted as a WorkflowArtifact and the step is in an awaiting stageState.

If the user submits after a disconnect, the action creates a new AgentRun. The old executor loop is not resumed.

## Preview Revision And Candidate Invalidation

If the user revises the plan during preview:

- mark the preview step skipped or superseded
- keep old candidate and validation artifacts as history
- invalidate the old candidate for commit
- create a new plan iteration with revision feedback as a fact

Enforce candidate freshness twice:

- early in `submitDecision`
- as a final guard in `commitExactCandidate`

The valid commit candidate must belong to the latest confirmed plan.

## Migration Strategy

Phase 1:

- Add shared trace DTOs and SSE event.
- Add new runtime modules.
- Add WorkflowAgentContextBuilder.
- Implement ToolRegistry.
- Make `runWorkflowTask()` internally use WorkflowAgentExecutor.
- Keep `run()` available but unused by the workflow main path.
- Keep old `parseWorkflowTaskOutput` for old paths only.

Phase 2:

- Move workflow candidate generation onto the new executor path.
- Add trace summary to AgentRun detail.
- Add frontend store support for `agent_trace_event`.
- Preserve existing WorkflowPanel behavior.

Phase 3:

- Remove old `run()` when all UI generation uses workflow.
- Remove old workflow task parser.
- Add optional frontend trace UI.
- Consider a dedicated trace table only if metadata summaries become too large.

## Acceptance Criteria

- WorkflowService remains the only module that persists artifacts, updates steps, emits SSE, and commits A2UI.
- AgentExecutor can repair invalid model JSON, invalid final drafts, and failed validation through observations.
- LLM output is strictly parsed as one JSON `AgentModelAction`.
- LLM never emits observations.
- Each iteration emits a realtime `agent_trace_event`.
- Tool calls are still persisted in `tool_calls`.
- AgentRun detail returns trace summary and tool calls.
- Clarification and decision forms survive frontend disconnect/reload.
- Preview plan revision invalidates old candidate without deleting history.
- Candidate commit uses exact stored candidate and never reruns the Agent.
- Existing WorkflowPanel behavior remains functionally unchanged in the first implementation.

## Out Of Scope

- Full prompt optimization.
- Context compression.
- New trace UI.
- New trace database table.
- Replacing backend or agent loggers.
- Allowing multiple tool calls in one model action.
- Production full model IO logging.
