# Model IO Logging Scratch

## Goal

Provide a simple, reliable way to inspect model inputs and outputs during local Agent development.

The first version focuses on:

- Backend terminal visibility.
- Optional JSONL trace files for local replay and comparison.
- Coverage for every model call path, including Workflow tasks.

It does not try to solve production audit logging, frontend trace browsing, or long-term database retention.

## Decisions

- Model IO logging is controlled by `MODEL_IO_LOG=off|summary|debug|full`.
- Logs are emitted from `ModelClient.generate()` so every model call path is covered.
- Human-readable terminal logs are used for quick debugging.
- Full trace files are written to `logs/model-io/YYYY-MM-DD.jsonl`.
- Each model call gets a `requestId` shared by terminal logs and JSONL.
- One JSONL line represents one model call, including request, response or error, duration, token usage, and trace context.
- `traceContext` is explicit and optional. Missing fields are written as `null`.
- Default terminal output is concise. Debug previews are truncated.
- `full` mode stores complete messages and response content after basic secret redaction.

## Modes

- `off`: no model IO logs.
- `summary`: terminal summary only.
- `debug`: terminal summary plus truncated input/output preview.
- `full`: terminal summary plus redacted full JSONL record.

## Trace Context

Model calls may include:

- `sessionId`
- `agentRunId`
- `workflowId`
- `workflowStepId`
- `task`
- `phase`
- `attempt`
- `round`

The logger must not fail when only part of this context is available.

## Redaction

The first version redacts common secret shapes:

- `Authorization: Bearer ...`
- `Bearer ...`
- `sk-...`
- JSON fields named `apiKey`, `api_key`, `authorization`, or `Authorization`
- `.env` style names ending in `KEY`, `TOKEN`, or `SECRET`

## Implementation Shape

- Add `packages/agent/src/model/model-io-logger.ts`.
- Extend `ModelClient.generate(messages, traceContext?)`.
- Pass trace context from:
  - initial Agent generation
  - repair generation
  - Workflow task generation
  - progressive disclosure rounds
- Add `logs/` to `.gitignore`.

## Validation

- Run Agent package typecheck.
- Run Agent package tests.
- Run a small local harness with `MODEL_IO_LOG=debug` to confirm `run()` and `runWorkflowTask()` both emit model IO logs.
