# 04 - ToolRegistry foundation

**构建内容：** 新增可注入 ToolRegistry，封装 ReAct Agent 可调用工具、工具参数校验、失败策略、observation 和 final artifact 返回。

**阻塞关系：** 02 - Runtime types and action parser.

**Status:** planned

## Scope

- 新增 `packages/agent/src/runtime/tool-registry.ts`。
- 定义 ToolRegistry 接口和 tool executor 接口。
- 第一版支持：
  - `getSkillContent`
  - `getSkillReferenceContent`
  - `getCatalogComponentDetails`
  - `validateA2UI`
  - `askClarification`
  - `askUserDecision`
- 每个工具声明 failure policy。
- `askClarification` 和 `askUserDecision` 返回 `final_artifact`。
- `validateA2UI` 可作为普通工具返回 observation。
- 工具参数和返回值都必须可脱敏摘要化，用于 trace/tool call。

## Acceptance Criteria

- [ ] 未授权工具调用返回不可恢复失败。
- [ ] 参数非法按工具 policy 返回失败或 observation。
- [ ] recoverable 工具失败可转为 observation。
- [ ] `askClarification` 成功返回 `clarification_form` final artifact。
- [ ] `askUserDecision` 成功返回 `decision_form` final artifact。
- [ ] `validateA2UI` 成功/失败都能返回结构化 observation。

## Out Of Scope

- 不保存 ToolCall 到数据库。
- 不发送 SSE。
- 不决定 WorkflowStep 状态。

