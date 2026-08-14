# API 契约

## 1. 定位

本文档是 HTTP API 与 SSE 事件的唯一权威入口。接口 DTO 类型应优先维护在 `packages/shared/src/api.ts` 与 `packages/shared/src/sse.ts`，后端路由实现必须与本文档保持一致。

历史完整接口稿已归档到 `docs/90-notes/archive/product/api.md`；如需要补充详细字段，应迁移到本文档，不再直接引用归档文件作为当前契约。

## 2. 通用约定

- Base URL：`/api`
- 请求和响应默认使用 JSON。
- 时间格式：ISO 8601 字符串。
- ID 格式：字符串，由后端生成。
- 错误响应使用统一结构：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "中文错误信息",
    "details": {}
  }
}
```

## 3. API 分组

### Runtime

- `GET /api/runtime/config`
- `PATCH /api/runtime/config`

### Sessions

- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId`

### Messages 与 Agent Runs

- `GET /api/sessions/:sessionId/messages`
- `POST /api/sessions/:sessionId/messages`
- `GET /api/sessions/:sessionId/agent-runs`
- `GET /api/sessions/:sessionId/agent-runs/:agentRunId`

### Agent Workflows

Workflow DTO 与 action 契约由 `packages/shared/src/api.ts` 维护。

> 状态：planned。以下为新 Agent Workflow 目标 API 契约，当前代码仍在迁移中。

- `GET /api/sessions/:sessionId/workflows`
- `GET /api/sessions/:sessionId/workflows/:workflowId`
- `POST /api/sessions/:sessionId/workflow/actions`

`MessageDto` 和 `AgentRunDto` 包含可选 `workflowId` 与 `workflowStepId`，用于把用户可见消息、模型运行记录和 workflow timeline 串起来。

目标 workflow 阶段：

```text
plan -> generate_a2ui -> validate -> preview -> commit
```

`WorkflowStepDto.stageState` 是 API DTO 字段，用于表达阶段内等待态：

- `awaiting_clarification`
- `awaiting_plan_confirmation`
- `awaiting_preview_confirmation`
- `null`

`POST /api/sessions/:sessionId/workflow/actions` 目标 action：

- `submit_clarification`
- `submit_decision`
- `retry_step`
- `cancel`

`submit_clarification`：

```json
{
  "action": "submit_clarification",
  "artifactId": "clarification_form_artifact_id",
  "payload": {
    "answers": {},
    "additionalText": "补充说明"
  }
}
```

规则：

- 只能作用于当前 `plan` step。
- 当前 step 必须是 `awaiting_confirmation + awaiting_clarification`。
- 后端记录用户 message 后重新运行 plan task。

`submit_decision`：

```json
{
  "action": "submit_decision",
  "artifactId": "decision_form_artifact_id",
  "payload": {
    "selectedOption": "confirm",
    "comment": "修改意见，仅 revise 允许"
  }
}
```

规则：

- `selectedOption` 只能是 `confirm`、`revise` 或 `reject`。
- `confirm` 不允许携带 comment。
- `revise` 必须携带非空 comment。
- `reject` 不要求 comment，后端记录用户 message，并停留在当前等待态。
- 在 `plan + awaiting_plan_confirmation` 下，`confirm` 完成 plan 并进入 `generate_a2ui`。
- 在 `plan + awaiting_plan_confirmation` 下，`revise` 保留旧 plan artifact，重新运行 plan task。
- 在 `preview + awaiting_preview_confirmation` 下，`confirm` 进入 `commit`。
- 在 `preview + awaiting_preview_confirmation` 下，`revise` 回到 `plan`，并把 preview 修改意见、旧 plan、candidate 和最近上下文传给 Agent。

artifact 输出规则：

- `clarification_form` 由 Agent 调用 `askClarification` 后生成。
- `plan_markdown` 由 Agent 生成，并必须通过 Markdown 最低校验。
- `decision_form` 由 Agent 调用 `askUserDecision` 后生成，只在工具实际调用时展示为特殊 UI block。
- `candidate_a2ui_messages` 只在 `validate` 通过后保存。
- `validation_report` 在 validate 成功或失败时都可以保存；失败时不得保存 candidate artifact。
- raw Agent Output 不进入 API 主流程，也不得作为 artifact content 返回。

### Files

- `POST /api/sessions/:sessionId/files`
- `GET /api/sessions/:sessionId/files`
- `GET /api/sessions/:sessionId/files/:fileId`
- `DELETE /api/sessions/:sessionId/files/:fileId`

### Skills

- `POST /api/skills`
- `GET /api/skills`
- `PATCH /api/skills/:skillId`
- `POST /api/sessions/:sessionId/skills/:skillId/enable`
- `POST /api/sessions/:sessionId/skills/:skillId/disable`

`SkillDto` 包含 `references: SkillReference[]`。`SkillReference` 字段为 `id`、`title`、`content` 和可选 `description`。`POST /api/skills` 与 `PATCH /api/skills/:skillId` 可传入 `references`，用于为 Skill 维护按需披露的参考资料正文。

### A2UI

- `GET /api/sessions/:sessionId/a2ui-events`
- `GET /api/sessions/:sessionId/surface-snapshots`
- `GET /api/sessions/:sessionId/surface-snapshots/current`

### Renderer 回传

- `POST /api/sessions/:sessionId/renderer/action`
- `POST /api/sessions/:sessionId/renderer/error`

### Export

- `GET /api/sessions/:sessionId/export`
- `GET /api/sessions/:sessionId/export/a2ui.jsonl`
- `GET /api/sessions/:sessionId/export/snapshot.json`

### SSE

- `GET /api/sessions/:sessionId/stream`

## 4. SSE 事件

SSE 事件类型由 `packages/shared/src/sse.ts` 维护。当前核心事件包括：

- `heartbeat`
- `agent_run_started`
- `agent_run_attempt`
- `assistant_message`
- `a2ui_messages`
- `surface_snapshot`
- `agent_run_completed`
- `agent_run_failed`
- `workflow_started`
- `workflow_step_updated`
- `workflow_artifact_created`
- `workflow_completed`
- `workflow_failed`

前端必须在会话切换时关闭旧 SSE 连接，并使用会话 ID 与会话修订号拦截迟到事件。

## 5. 错误码分类

- 通用错误：参数错误、未找到、内部错误。
- 会话错误：会话不存在、会话已归档。
- 文件错误：文件类型不支持、文件过大、文件读取失败。
- Agent 错误：模型调用失败、输出解析失败、A2UI 校验失败。
- Renderer 错误：action/error 回传数据非法。

## 6. 维护规则

- 新增或修改接口时，先更新 `packages/shared/src/api.ts`，再更新后端路由和本文档。
- 新增或修改 SSE 事件时，先更新 `packages/shared/src/sse.ts`，再更新后端推送和前端消费逻辑。
- API 文档只描述跨模块契约，不复制后端 service 内部实现。

