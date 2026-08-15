# ReAct Agent Runtime Issues

This directory breaks the ReAct Agent Runtime implementation into small planned issues.

## Order

1. [Shared trace and SSE contract](./01-shared-trace-and-sse-contract.md)
2. [Runtime types and action parser](./02-runtime-types-and-action-parser.md)
3. [Prompt composer contract](./03-prompt-composer-contract.md)
4. [ToolRegistry foundation](./04-tool-registry-foundation.md)
5. [WorkflowAgentExecutor loop](./05-workflow-agent-executor-loop.md)
6. [WorkflowAgentContextBuilder](./06-workflow-agent-context-builder.md)
7. [Backend trace persistence and SSE](./07-backend-trace-persistence-and-sse.md)
8. [runWorkflowTask migration](./08-run-workflow-task-migration.md)
9. [Candidate validation and preview invalidation guards](./09-candidate-validation-and-preview-invalidation-guards.md)
10. [Frontend trace store support](./10-frontend-trace-store-support.md)
11. [Tests and cleanup plan](./11-tests-and-cleanup-plan.md)

## Scope Guard

The first version preserves the existing platform flow:

- no new trace database table
- no new trace UI
- no replacement of backend or agent loggers
- no multiple tool calls per model action
- no production `MODEL_IO_LOG=full`
- no direct AgentExecutor database writes, SSE sends, or A2UI commits

