# Model IO Logging Issues

This directory breaks the first Model IO Logging implementation into small planned issues.

## Order

1. [Model IO logger foundation](./01-model-io-logger-foundation.md)
2. [ModelClient JSONL integration](./02-model-client-jsonl-integration.md)
3. [Agent Runtime trace context](./03-agent-runtime-trace-context.md)
4. [Validation and local safety](./04-validation-and-local-safety.md)

## Scope Guard

The first version is intentionally local-development focused:

- backend terminal output
- optional local JSONL files
- no API
- no SSE
- no database retention
- no frontend trace UI
