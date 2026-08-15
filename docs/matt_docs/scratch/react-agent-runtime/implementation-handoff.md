# ReAct Agent Runtime Implementation Handoff

## 1. Module Overview

Module name: ReAct Agent Runtime.

Responsibility:

- Provide a workflow-driven AgentExecutor for one controlled workflow task at a time.
- Run a ReAct loop over model actions, tool calls, observations, validation failures, and repair attempts.
- Return structured final artifacts or failure results to WorkflowService.
- Emit trace events through callbacks so backend can persist summaries and send SSE.

Scope:

- Replace the workflow task execution internals behind `runWorkflowTask()`.
- Preserve the existing WorkflowService ownership of persistence, workflow transitions, SSE, and commit.
- Preserve existing WorkflowPanel behavior in the first implementation.
- Keep `run()` available during the first migration phase, but stop using it for the workflow main path.

Out of scope:

- Removing `run()` in the first implementation.
- Removing the old workflow task parser in the first implementation.
- Adding a new trace database table.
- Adding a new frontend trace UI.
- Replacing backend `pino`, agent console logger, or Model IO logger.
- Allowing multiple tool calls in one model action.
- Enabling production `MODEL_IO_LOG=full`.

Dependencies:

- Shared DTOs in `packages/shared/src/api.ts` and `packages/shared/src/sse.ts`.
- Agent types in `packages/shared/src/agent.ts`.
- Current ModelClient in `packages/agent/src/model/model-client.ts`.
- A2UI validation in `packages/agent/src/tools/validate-a2ui.ts`.
- Catalog helpers in `packages/agent/src/tools/catalog-schema.ts`.
- Workflow orchestration in `packages/backend/src/services/workflow.service.ts`.
- Agent run persistence in `packages/backend/src/repositories/agent-run.repository.ts`.
- Tool call persistence in `packages/backend/src/repositories/tool-call.repository.ts`.
- SSE delivery in `packages/backend/src/services/stream.service.ts`.
- Frontend workspace store in `packages/frontend/src/stores/workspace.ts`.

## 2. Business Logic Definition

Core behavior:

- WorkflowService creates or updates the persisted AgentRun record for a workflow task.
- WorkflowService builds executor input from current workflow state and session facts.
- WorkflowService injects a ToolRegistry and trace callback into AgentExecutor.
- AgentExecutor loops until it returns completed, failed, or reaches its limits.
- Model output must be a single JSON action: `tool_call`, `final_draft`, or `give_up`.
- Model output must never include observations.
- Parser, validator, and ToolRegistry generate observations.
- Recoverable observations are fed into the next model iteration.
- `askClarification` and `askUserDecision` are model `tool_call` actions but return final artifacts.
- Waiting for user input is represented by WorkflowArtifact plus WorkflowStep waiting state, not by a suspended AgentRun.
- `validateA2UI` is both a normal tool and a forced final validator for candidate A2UI.
- WorkflowService saves final artifacts and advances workflow state after AgentExecutor returns.

User flow:

1. User sends initial UI request or submits workflow feedback.
2. WorkflowService determines the current workflow step and task goal.
3. WorkflowService builds AgentExecutor input.
4. AgentExecutor calls model for one JSON action.
5. If the model calls a normal tool, ToolRegistry returns an observation and the executor loops.
6. If the model calls `askClarification` or `askUserDecision`, ToolRegistry returns a final artifact and the executor completes.
7. If the model outputs final draft, AgentExecutor normalizes and validates it.
8. If final validation fails and is recoverable, AgentExecutor adds an observation, stores currentDraft, and loops.
9. If AgentExecutor completes, WorkflowService persists artifacts and updates WorkflowStep.
10. If AgentExecutor fails, WorkflowService records failure and marks the step retryable.

State transitions:

- `clarification_form` final artifact:
  - WorkflowService saves `clarification_form`.
  - WorkflowStep becomes `awaiting_confirmation`.
  - WorkflowStep stageState becomes `awaiting_clarification`.
- `plan_markdown` final artifact with companion decision form:
  - WorkflowService saves `plan_markdown`.
  - WorkflowService saves `decision_form`.
  - WorkflowStep becomes `awaiting_confirmation`.
  - WorkflowStep stageState becomes `awaiting_plan_confirmation`.
- `candidate_a2ui_messages` final artifact:
  - WorkflowService performs final gate validation.
  - WorkflowService creates or updates validate/report/preview flow according to existing workflow rules.
- `decision_form` final artifact for preview:
  - WorkflowService saves `decision_form`.
  - WorkflowStep becomes `awaiting_confirmation`.
  - WorkflowStep stageState becomes `awaiting_preview_confirmation`.
- executor failure:
  - WorkflowService marks the current step failed.
  - Workflow status becomes retryable according to existing failure handling.

NEEDS CLARIFICATION:

- Exact final WorkflowService step metadata fields for candidate invalidation should be finalized during implementation because current metadata conventions vary across existing workflow methods.

## 3. Data Model Mapping

DB tables used:

- `agent_runs`
- `tool_calls`
- `agent_workflows`
- `workflow_steps`
- `workflow_artifacts`
- `a2ui_events`
- `surface_snapshots`
- `messages`
- `sessions`

Fields used:

- `agent_runs.id`: persisted AgentRun ID passed into AgentExecutor input as `runId`.
- `agent_runs.workflow_id`: associates run with workflow.
- `agent_runs.workflow_step_id`: associates run with step.
- `agent_runs.status`: remains existing string status. Do not add `suspended`.
- `agent_runs.attempt_count`: should represent completed executor iterations or compatible attempt count. NEEDS CLARIFICATION if existing UI expects attemptIndex semantics only.
- `agent_runs.max_attempts`: existing maximum attempt count; executor also has `limits.maxIterations`.
- `agent_runs.failure_reason`: stores executor or gate failure reason.
- `agent_runs.validation_summary`: can store final validation summary when applicable.
- `agent_runs.token_usage`: stores accumulated token usage.
- `agent_runs.metadata`: stores `traceSummary`.
- `tool_calls.agent_run_id`: associates tool call with run.
- `tool_calls.session_id`: associates tool call with session.
- `tool_calls.tool_name`: stores tool name.
- `tool_calls.status`: existing `running`, `succeeded`, or `failed`.
- `tool_calls.attempt_index`: use executor iteration index.
- `tool_calls.input_summary`: include sanitized arguments summary and `reasoningSummary`.
- `tool_calls.output`: sanitized tool output summary.
- `tool_calls.error_message`: failure message.
- `tool_calls.duration_ms`: tool duration.
- `workflow_steps.status`: existing step lifecycle.
- `workflow_steps.stage_state`: existing domain waiting state.
- `workflow_artifacts.kind`: existing artifact kind.
- `workflow_artifacts.content_text`: used for `plan_markdown`.
- `workflow_artifacts.content_json`: used for forms, candidate messages, and validation report.
- `workflow_artifacts.metadata`: stores source agentRunId, toolCallId when available, source plan/candidate IDs, and invalidation references when needed.

Relationships:

- Session has AgentRuns, Workflows, Messages, A2UI events, and snapshots.
- AgentRun may belong to one AgentWorkflow and one WorkflowStep.
- WorkflowStep has WorkflowArtifacts and AgentRuns.
- WorkflowArtifact belongs to AgentWorkflow and optionally WorkflowStep.
- ToolCall belongs to AgentRun.

Constraints:

- `workflow_steps` has unique `(workflowId, sequence)`.
- `workflow_artifacts` has unique `(workflowId, kind, version)`.
- `a2ui_events` has unique `(sessionId, sequence)`.
- `surface_snapshots` has unique `(sessionId, sequence)`.

No new DB fields are required in first version.

## 4. API Mapping

Existing APIs used:

- `GET /api/sessions/:sessionId/agent-runs`
  - Request: session ID and optional pagination query.
  - Response: existing AgentRun list.
  - Changes: no AgentRunDto metadata addition.
  - Error cases: existing not found/session errors.
- `GET /api/sessions/:sessionId/agent-runs/:runId`
  - Request: session ID and run ID.
  - Response: AgentRun detail plus tool calls, assistant message, A2UI events.
  - Required change: add `traceSummary: AgentRunTraceSummaryDto | null`.
  - Error cases: run not found.
- `GET /api/sessions/:sessionId/workflows`
  - Request: session ID.
  - Response: workflow detail list.
  - Changes: no required response change for first runtime implementation.
- `POST /api/sessions/:sessionId/workflow/actions`
  - Request: existing WorkflowActionRequest union.
  - Response: existing WorkflowActionResponse.
  - Changes: internals may create new AgentRun and invoke new executor.
  - Error cases: existing conflict/not found behavior.
- `GET /api/sessions/:sessionId/stream`
  - Request: SSE connection.
  - Response: Server-Sent Events.
  - Required change: add `agent_trace_event`.

New APIs:

- No new HTTP endpoint in first version.

SSE additions:

- Event name: `agent_trace_event`.
- Payload: `AgentTraceEventDto`.
- Recovery: not replayed from SSE. Recovery comes from AgentRun detail `traceSummary`.

NEEDS CLARIFICATION:

- Whether `GET /api/sessions/:sessionId/workflows` should eventually include latest trace summaries for workflow agentRuns. First version says no.

## 5. Frontend Responsibilities

UI components involved:

- `packages/frontend/src/stores/workspace.ts`
- `packages/frontend/src/services/stream.ts`
- Existing WorkflowPanel remains functionally unchanged.

State management:

- Add `runtimeTraceEvents: AgentTraceEventDto[]` to workspace store.
- Clear `runtimeTraceEvents` on new conversation and session switch.
- Consume `agent_trace_event` from SSE and append to `runtimeTraceEvents`.
- Keep `runtimeToolCalls` separate from trace events.
- Keep existing workflow, message, snapshot, and runtime tool call behavior.

API integration points:

- Update shared type import usage for `AgentTraceEventDto`.
- Update stream handlers to accept `agent_trace_event`.
- AgentRun detail loader should be able to read `traceSummary` once backend adds it.

Out of scope:

- No new AgentTracePanel.
- No new iteration timeline UI.
- No visual redesign.

Network failure behavior:

- If SSE disconnects, existing reconnect behavior remains.
- If page reloads, workflow forms recover from persisted WorkflowArtifacts.
- Trace recovery comes from AgentRun detail, not from SSE replay.

## 6. Backend Responsibilities

Services involved:

- `workflow.service.ts`: owns workflow transitions, artifacts, AgentRun persistence, trace event callback handling, and SSE sends.
- `agent-run.service.ts`: may keep existing non-workflow paths during migration; workflow main path should move to the new executor via `runWorkflowTask()` first.
- `stream.service.ts`: sends `agent_trace_event`.
- `skill-resolver.service.ts`: continues providing enabled skill facts.
- `snapshot.service.ts`: continues final commit snapshot computation.

Controllers/routes:

- `routes/agent-runs.ts`: no route shape change; response mapping must include traceSummary in detail.
- `routes/workflows.ts`: no route shape change.
- `routes/stream.ts`: no route shape change; event union expands.

Validation logic:

- WorkflowService final gate validates result kind against current workflow step.
- AgentExecutor validates against `goal.expectedResult` for self-repair.
- Candidate A2UI must be validated by AgentExecutor and re-gated by WorkflowService before artifact persistence.
- `askClarification` and `askUserDecision` artifacts must be structurally valid before WorkflowService saves them.

Error handling rules:

- Parser errors become Agent Observation until executor limits are reached.
- Recoverable tool errors become Agent Observation.
- Non-recoverable tool errors fail executor.
- Executor limit reached fails executor.
- WorkflowService marks failed step retryable according to existing failure handling.
- AgentExecutor must not throw for normal model invalid output; it should return structured failure after loop exhaustion.

Logging:

- Keep backend pino logger.
- Keep agent console logger.
- Keep Model IO logger.
- Add trace events through callback, not direct logger replacement.

## 7. Execution Flow

Initial plan flow:

1. User sends UI generation request.
2. Message service detects workflow intent and creates or finds active workflow.
3. WorkflowService creates `plan` step and AgentRun record.
4. WorkflowService builds ReactAgentRunInput with task `plan`.
5. WorkflowService injects ToolRegistry and `onTraceEvent`.
6. AgentExecutor starts iteration 1 and emits `iteration_started`.
7. PromptComposer builds system/user model messages.
8. ModelClient calls the configured model.
9. Action parser parses model output.
10. If action is `tool_call`, ToolRegistry executes it.
11. If tool returns normal observation, executor appends observation and loops.
12. If tool returns `clarification_form` final artifact, executor returns completed.
13. WorkflowService writes trace summary into AgentRun metadata.
14. WorkflowService saves `clarification_form` artifact.
15. WorkflowService updates step to `awaiting_confirmation` and `awaiting_clarification`.
16. WorkflowService sends workflow artifact/step SSE events.
17. Frontend WorkflowPanel displays form from persisted artifact.

Plan completed flow:

1. AgentExecutor returns `plan_markdown` final artifact with companion decision form.
2. WorkflowService writes trace summary into AgentRun metadata.
3. WorkflowService saves `plan_markdown` artifact.
4. WorkflowService saves companion `decision_form` artifact.
5. WorkflowService updates plan step to `awaiting_confirmation` and `awaiting_plan_confirmation`.
6. Frontend displays plan and decision form.

Clarification submission flow:

1. User submits clarification form.
2. Frontend calls `POST /workflow/actions`.
3. WorkflowService validates artifact and current stageState.
4. WorkflowService creates a new AgentRun; it does not resume the old executor loop.
5. WorkflowAgentContextBuilder includes clarification answers as facts.
6. AgentExecutor runs the plan task again.
7. WorkflowService persists the result and advances as above.

Generate candidate flow:

1. User confirms plan.
2. WorkflowService completes plan step and creates `generate_a2ui` step.
3. WorkflowService creates AgentRun and executor input with confirmed plan fact.
4. AgentExecutor loops until candidate final draft or failure.
5. AgentExecutor forces `validateA2UI` on candidate final draft.
6. If validation fails, error becomes observation and executor loops.
7. If validation passes, executor returns completed candidate artifact.
8. WorkflowService performs final gate validation.
9. WorkflowService writes validation report and candidate artifact according to existing generate/validate split.
10. WorkflowService opens preview decision flow.

Preview revise-to-plan flow:

1. User chooses revise during preview and asks to change plan.
2. WorkflowService treats it as plan iteration, not direct candidate patch.
3. WorkflowService marks preview step skipped or superseded.
4. WorkflowService keeps old candidate artifacts as history.
5. WorkflowService invalidates old candidate for commit.
6. WorkflowService creates a new plan AgentRun with revision feedback, old plan, candidate, and validation report facts.
7. New plan flow runs.

Commit flow:

1. User confirms preview decision.
2. WorkflowService verifies candidate belongs to latest confirmed plan.
3. WorkflowService creates commit step.
4. WorkflowService commits exact stored candidate.
5. WorkflowService creates A2UIEvent and SurfaceSnapshot through existing commit logic.
6. AgentExecutor is not called during commit.

## 8. Edge Cases

Invalid model JSON:

- Expected behavior: parser returns failure; executor appends system observation and loops.
- If maxIterations is reached, executor returns failed.

Model outputs observation:

- Expected behavior: parser rejects it as invalid action; executor appends parse observation and loops.

Model outputs multiple tool calls:

- Expected behavior: parser rejects it in first version.

Unauthorized tool:

- Expected behavior: ToolRegistry returns non-recoverable failure.

Tool parameter invalid:

- Expected behavior: use tool failure policy. Recoverable invalid input becomes observation; non-recoverable invalid input fails executor.

`askClarification` or `askUserDecision` succeeds:

- Expected behavior: returns final artifact and ends executor; no suspended AgentRun state.

Candidate validation fails:

- Expected behavior: `validateA2UI` failure is observation; executor loops with currentDraft preserved.

Executor process crashes mid-run:

- Expected behavior: NEEDS CLARIFICATION for watchdog behavior. Existing system may leave run running unless outer service catches error. Implementation should catch executor error and mark step failed_retryable.

Frontend SSE disconnects:

- Expected behavior: frontend reconnects if possible; workflow UI recovery uses persisted WorkflowArtifact and WorkflowStep state.

Frontend reloads while form is visible:

- Expected behavior: form remains visible because artifact and stageState are persisted.

Preview revise invalidates candidate:

- Expected behavior: old candidate remains in history but cannot commit.

Race condition: user submits stale decision artifact:

- Expected behavior: WorkflowService rejects based on current step/stageState/artifact relation.

Race condition: old candidate commit after plan revision:

- Expected behavior: `submitDecision` rejects early and `commitExactCandidate` rejects as final guard.

Network failure during action submit:

- Expected behavior: frontend can reload workflow detail. If user message/action reached backend, workflow eventually reflects result. If not, user retries.

Empty facts:

- Expected behavior: executor can call `askClarification` if required facts are missing.

Unauthorized access:

- NEEDS CLARIFICATION because current code context does not show authentication/authorization. Do not invent auth behavior.

## 9. Testing Plan

Unit tests:

- `react-action-parser.test.ts`
  - parses valid `tool_call`.
  - parses valid `final_draft`.
  - parses valid `give_up`.
  - rejects non-JSON.
  - rejects arrays.
  - rejects missing `reasoningSummary`.
  - rejects unknown action type.
  - rejects model-generated observation.
  - rejects multiple actions.
- `tool-registry.test.ts`
  - unauthorized tool is non-recoverable failure.
  - recoverable tool failure becomes observation.
  - `askClarification` returns final artifact.
  - `askUserDecision` returns final artifact.
  - `validateA2UI` returns completed/failed observation.
- `workflow-agent-executor.test.ts`
  - parse error loops then succeeds.
  - normal tool call appends observation and loops.
  - recoverable tool failure loops.
  - final validation failure preserves currentDraft and loops.
  - candidate `validateA2UI` failure loops.
  - artifact-producing tool completes executor.
  - maxIterations returns failed.
- `workflow-agent-context-builder.test.ts`
  - builds plan facts.
  - builds clarification-answer facts.
  - builds confirmed-plan facts.
  - builds preview revise-to-plan facts.

Backend tests:

- WorkflowService receives trace events and sends `agent_trace_event`.
- WorkflowService writes `traceSummary` into AgentRun metadata at run end.
- AgentRun detail returns `traceSummary`.
- ToolCall inputSummary includes `reasoningSummary`.
- Clarification final artifact creates awaiting clarification state.
- Plan final artifact creates plan and decision artifacts.
- Candidate failure does not save candidate artifact.
- Preview revise invalidates old candidate.
- Commit rejects stale candidate.

Frontend tests:

- stream handler accepts `agent_trace_event`.
- workspace store appends trace events separately from tool calls.
- session switch clears trace events.
- existing WorkflowPanel behavior remains unchanged.

Manual smoke tests:

- Start a workflow and observe `agent_trace_event` frames in browser devtools.
- Disconnect/reload during clarification and verify form persists.
- Force invalid model JSON in fake client and verify repair loop trace.
- Force candidate validation failure and verify retry inside executor before step failure.

## 10. Task Breakdown for AI Coding

- TASK-1: Add shared trace DTO and SSE event contract
  - Goal: Add `AgentTraceEventDto`, `AgentRunTraceSummaryDto`, `AgentRunDetailResponse.traceSummary`, and `agent_trace_event`.
  - Files/areas likely touched: `packages/shared/src/api.ts`, `packages/shared/src/sse.ts`.
  - Acceptance checks: shared package typecheck passes; no AgentRunDto metadata added.
  - Estimated size: `<200 lines change`

- TASK-2: Add ReAct runtime internal types
  - Goal: Create runtime-only type contracts for AgentExecutor loop.
  - Files/areas likely touched: `packages/agent/src/runtime/react-agent-types.ts`.
  - Acceptance checks: types import existing shared A2UI/agent/api types; no DB/backend imports.
  - Estimated size: `<200 lines change`

- TASK-3: Implement strict action parser
  - Goal: Parse single JSON `AgentModelAction` and return structured parse failures.
  - Files/areas likely touched: `packages/agent/src/runtime/react-action-parser.ts`, parser tests.
  - Acceptance checks: valid actions parse; invalid outputs fail without throwing for normal invalid model output.
  - Estimated size: `<200 lines change`

- TASK-4: Implement ReAct prompt composer
  - Goal: Compose stable system prompt and per-iteration user prompt.
  - Files/areas likely touched: `packages/agent/src/runtime/react-prompt-composer.ts`, prompt tests.
  - Acceptance checks: prompt includes JSON-only rule, no-observation rule, allowed tools, expected final kind.
  - Estimated size: `<200 lines change`

- TASK-5: Implement ToolRegistry shell and built-in tools
  - Goal: Provide injected ToolRegistry with first-version tools and failure policy.
  - Files/areas likely touched: `packages/agent/src/runtime/tool-registry.ts`, existing validate/catalog helpers.
  - Acceptance checks: normal observations and final artifacts are returned as specified.
  - Estimated size: `<200 lines change`

- TASK-6: Implement WorkflowAgentExecutor loop
  - Goal: Run model/action/tool/final-validation loop with trace callbacks.
  - Files/areas likely touched: `packages/agent/src/runtime/workflow-agent-executor.ts`, executor tests.
  - Acceptance checks: loop handles parse error, tool observation, final validation failure, artifact-producing tools, and maxIterations.
  - Estimated size: `<200 lines change`

- TASK-7: Implement WorkflowAgentContextBuilder
  - Goal: Build goal/facts/capabilities/currentDraft from WorkflowService-provided data.
  - Files/areas likely touched: `packages/agent/src/runtime/workflow-agent-context-builder.ts`, builder tests.
  - Acceptance checks: all first-version workflow tasks can produce executor input without DB access.
  - Estimated size: `<200 lines change`

- TASK-8: Add backend trace persistence and SSE bridge
  - Goal: Convert executor trace events to SSE and final trace summary metadata.
  - Files/areas likely touched: `packages/backend/src/services/workflow.service.ts`, `packages/backend/src/services/agent-run.service.ts`, `packages/backend/src/routes/agent-runs.ts`, mappers.
  - Acceptance checks: `agent_trace_event` sends; AgentRun detail returns traceSummary; tool calls still work.
  - Estimated size: `<200 lines change`

- TASK-9: Migrate `runWorkflowTask()` to new executor
  - Goal: Keep public runtime compatibility while routing workflow tasks through WorkflowAgentExecutor.
  - Files/areas likely touched: `packages/agent/src/runtime/agent-runtime.ts`, `packages/agent/src/runtime/create-agent-runtime.ts`, tests.
  - Acceptance checks: plan, generate candidate, and preview decision tasks map to existing `AgentWorkflowTaskResult`.
  - Estimated size: `<200 lines change`

- TASK-10: Add candidate freshness guards
  - Goal: Enforce candidate validation and preview revise-to-plan invalidation rules.
  - Files/areas likely touched: `packages/backend/src/services/workflow.service.ts`, workflow tests.
  - Acceptance checks: stale candidate cannot commit; exact stored candidate commit remains unchanged.
  - Estimated size: `<200 lines change`

- TASK-11: Add frontend trace store support
  - Goal: Store `agent_trace_event` in workspace store without new UI.
  - Files/areas likely touched: `packages/frontend/src/stores/workspace.ts`, `packages/frontend/src/services/stream.ts`, frontend tests.
  - Acceptance checks: trace events stored separately from tool calls; session switch clears trace.
  - Estimated size: `<200 lines change`

- TASK-12: Add full regression tests and cleanup checklist
  - Goal: Prove new executor path and document safe removal criteria for old runtime code.
  - Files/areas likely touched: agent/backend/frontend test files, `docs/matt_docs/scratch/react-agent-runtime/issues/11-tests-and-cleanup-plan.md`.
  - Acceptance checks: parser, registry, executor, backend trace, frontend store tests pass; cleanup criteria documented.
  - Estimated size: `<200 lines change`
