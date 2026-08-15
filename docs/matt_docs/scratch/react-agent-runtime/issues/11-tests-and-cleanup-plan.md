# 11 - Tests and cleanup plan

**构建内容：** 为 ReAct Agent runtime 增加单元测试，并记录迁移后清理旧 runtime 代码的条件。

**Status:** implemented

## 已完成的测试

agent 包（`pnpm --filter @a2ui-platform/agent test`，56 tests passed）：

- `react-action-parser.test.ts`：合法 `tool_call` / `final_draft` / `give_up` 解析；拒绝非 JSON、数组、缺字段、未知 type、observation、旧 tool-call 文本格式、围栏外杂音。
- `tool-registry.test.ts`：未授权工具不可恢复失败、`askClarification` / `askUserDecision` final artifact、参数非法 recoverable 失败、`getSkillContent` observation、`validateA2UI` observation。
- `workflow-agent-executor.test.ts`：parse error 后循环、artifact-producing 工具完成 executor、final_draft 校验失败保留 currentDraft、normal tool call 追加 observation、finalKind 不匹配、maxIterations 返回 failed、onTraceEvent 携带 session/run 关联字段。

## 尚未覆盖（后续补充）

- backend `workflow.service.test.ts`：trace event SSE 桥接、trace summary 写入 metadata、candidate freshness guard。
- frontend stream/store：`agent_trace_event` 入 store、session 切换清理。

## 清理条件（删除 run() 与旧 parser 的前置）

删除以下代码前，必须满足所有条件：

1. **`AgentRuntime.run()`（非 workflow 路径）**
   - 条件：`agent-run.service.ts` 中的非 workflow candidate 生成路径（`runtime.run(...)` → `recordCandidateSuccess`）已迁移到 workflow 主路径或确认废弃。
   - 现状：仍被 `agent-run.service.ts` 调用，暂不可删。

2. **`parseWorkflowTaskOutput`（旧 workflow task parser，`workflow-task-parser.ts`）**
   - 条件：确认无任何路径调用（当前 `runWorkflowTask` 已切到新 executor，此 parser 已是死代码）。
   - 现状：仅 `agent-runtime.ts` import 但不再调用，可随 `run()` 一起清理。

3. **`AgentRuntime.composeWorkflowTaskPrompt`（旧 workflow prompt）**
   - 条件：同上，已被 `ReactPromptComposer` 取代。
   - 现状：私有方法，已不被调用。

4. **`run()` 使用的渐进式披露逻辑（`generateWithProgressiveDisclosure` 等）与 `parseModelOutput` / `parseComponentInfoRequest` / `parseSkillInfoRequest` / `parseSkillReferenceRequest`**
   - 条件：随 `run()` 一起清理，仅在非 workflow 路径不再需要时删除。

## 建议清理顺序

1. 先迁移 `agent-run.service.ts` 的非 workflow candidate 路径到 workflow 主路径（或确认废弃）。
2. 删除 `run()` 及其私有依赖（渐进式披露、旧 parser、`composeWorkflowTaskPrompt`）。
3. 删除 `workflow-task-parser.ts`。
4. 最后清理 `AgentRuntime` 中不再被引用的 import。

> 注意：在满足上述条件前，旧代码保持可用但不被 workflow 主路径调用，符合 spec「保留旧路径，迁移后清理」的策略。
