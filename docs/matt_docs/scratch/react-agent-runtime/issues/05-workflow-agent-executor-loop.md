# 05 - WorkflowAgentExecutor loop

**构建内容：** 实现 ReAct while loop：模型动作解析、工具执行、observation 追加、currentDraft 修复、final validation 和 trace event 回调。

**阻塞关系：** 02 - Runtime types and action parser, 03 - Prompt composer contract, 04 - ToolRegistry foundation.

**Status:** planned

## Scope

- 新增 `packages/agent/src/runtime/workflow-agent-executor.ts`。
- 使用现有 `ModelClient`，不重写模型 HTTP 客户端。
- 通过外部注入 `ToolRegistry`。
- 通过 `onTraceEvent(event)` 回调输出 iteration、model action、tool call、observation 和 final validation 摘要。
- parser error 转为 system observation 并继续循环。
- final validation failure 转为 observation，保存 `currentDraft` 并继续循环。
- candidate final draft 强制调用 `validateA2UI`。
- 达到 maxIterations 后返回 failed。

## Acceptance Criteria

- [ ] 每轮最多处理一个 tool call。
- [ ] parser error 不直接失败，会进入下一轮，直到达到限制。
- [ ] recoverable tool failure 会进入下一轮。
- [ ] `askClarification` / `askUserDecision` final artifact 会结束 executor 并返回 completed。
- [ ] invalid final draft 会保留 currentDraft 并让模型修复。
- [ ] candidate final draft 未通过 `validateA2UI` 不返回 completed。
- [ ] executor 不读写数据库、不发送 SSE、不保存 artifact、不 commit A2UI。

## Out Of Scope

- 不接入 WorkflowService。
- 不实现 frontend trace UI。
- 不支持批量 tool calls。

