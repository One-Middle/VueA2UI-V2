# Integration 模块说明

## 1. 功能定位

本文档描述 Frontend、Renderer、Backend、Agent 和 Shared 的端到端协作方式。它不替代各模块实现文档，也不重复 API、DB 或 A2UI 的完整契约。

核心原则：后端是持久化和提交边界，Agent 是受控生成边界，Renderer 是渲染和本地交互边界，Frontend 是用户体验和桥接边界，Shared 是类型契约边界。

## 2. 模块关系

```text
Frontend
  -> HTTP / SSE
Backend
  -> AgentRunInput
Agent
  -> AgentRunResult
Backend
  -> committed A2UI event + current snapshot
Frontend
  -> Renderer messages
Renderer
  -> a2ui:action / a2ui:error
Frontend
  -> Renderer callback API
Backend
```

`Shared` 被 Agent、Backend、Frontend、Renderer 共同依赖，用来统一 A2UI、API DTO、SSE 和 Agent runtime 类型。

## 3. 端到端成功路径

Workflow 路径：

```text
MessageInput
  -> workspace.sendMessage()
  -> POST /api/sessions/:sessionId/messages
  -> MessageService 创建 user message
  -> 命中 active workflow 或 UI 生成 intent 时，关联或新建 Agent Workflow
  -> startInitialPlanning() 创建 plan step
  -> runWorkflowTask(task="plan") 执行 ReAct 循环
  -> ReAct 产出 clarification_form 或 plan_markdown + decision_form
  -> SSE agent_trace_event 实时回传循环进度
  -> Frontend WorkflowPanel 展示 clarification form 或 plan + decision form
  -> POST workflow/actions { submit_clarification | submit_decision }
  -> submit_clarification 重新运行 task="plan"（带澄清答案）
  -> submit_decision(confirm) 完成 plan，创建 generate_a2ui step
  -> executeGenerateA2UI() -> runWorkflowTask(task="generate_a2ui") 生成 candidate
  -> backend validate step 二次校验，保存 validation_report + candidate_a2ui_messages artifact
  -> createPreviewDecision() -> runWorkflowTask(task="preview_decision") 生成 decision form
  -> Frontend 预览 candidate（PreviewPanel + Renderer）
  -> submit_decision(confirm) -> commitExactCandidate()
  -> Backend 在同一事务创建 assistant message + A2UI event + current surface snapshot，完成 workflow
  -> SSE assistant_message / a2ui_messages / surface_snapshot / workflow_completed
  -> workspace store -> renderer store -> PreviewPanel MessageProcessor -> A2uiSurface 渲染
```

普通非 workflow 消息路径：

```text
MessageInput
  -> workspace.sendMessage()
  -> POST /api/sessions/:sessionId/messages
  -> MessageService 创建 user message + pending Agent run
  -> AgentRunService.executeRun()
  -> createAgentRuntime().run()
  -> 渐进披露 getSkillContent / getSkillReferenceContent / getCatalogComponentDetails
  -> validateA2UI
  -> AgentRunService.commitRun()
  -> message + A2UI event + current snapshot
  -> SSE assistant_message / a2ui_messages / surface_snapshot / agent_run_completed
  -> workspace store -> renderer store -> PreviewPanel MessageProcessor -> A2uiSurface 渲染
```

## 4. TEXT_ONLY 路径

```text
Agent 返回 TEXT_ONLY
  -> Backend 创建 assistant message
  -> 更新 agent run 为 committed
  -> 不创建 A2UI event
  -> 不创建 surface snapshot
  -> SSE assistant_message / agent_run_completed
  -> Frontend 更新对话和 Runtime 状态
  -> Renderer 不变
```

## 5. 失败路径

普通 Agent run 失败：

```text
模型输出解析失败或 A2UI 校验失败
  -> Agent repair prompt
  -> 最多 3 次尝试
  -> 仍失败则返回 FAILED
  -> Backend 创建 validation_error assistant message
  -> AgentRun failed
  -> SSE agent_run_failed
  -> Frontend 展示失败消息
  -> 不写 A2UI event / snapshot
  -> Renderer 不变
```

Workflow task 失败：

```text
ReAct 循环内模型 give_up 或达到最大迭代次数
  -> runWorkflowTask 返回 failure ParsedAgentResult
  -> WorkflowService 标记当前 step failed
  -> failWorkflow(status=failed_retryable)
  -> SSE workflow_failed
  -> Frontend WorkflowPanel 展示失败 step 与重试入口
  -> candidate 生成失败时保存 validation_report，不创建正式 A2UI event/snapshot
```

## 6. 关键集成点

### Frontend -> Backend

- HTTP API 由 `packages/frontend/src/services/api.ts` 调用。
- SSE 由 `packages/frontend/src/services/stream.ts` 管理。
- 会话切换时必须断开旧 SSE，并通过 `_sessionRevision` 过滤旧响应和旧事件。
- `VITE_API_BASE_URL` 会被归一化为以 `/api` 结尾的 base URL。

### Backend -> Agent

- Backend 组装 `AgentRunInput`，包含用户消息、最近历史、上传文件内容、enabled skills、current snapshot、Catalog/Renderer 版本和模型配置。
- workflow task 额外组装 `AgentWorkflowTaskInput`（gate / stepType / stageState / task / availableTools / resourceLedger / agentRunId 等）。
- Agent 不访问数据库，也不读取任意本地路径。
- 普通 run 的工具调用通过 `onToolCall` 回传，Backend 写入 `toolCall` 并通过 SSE 推送 `agent_run_attempt`。
- workflow task 的 ReAct trace 通过 `onTraceEvent` 回传，Backend 转发为 `agent_trace_event` SSE。
- Backend 只提交 Agent 返回且通过 `validateA2UI` 的 A2UI messages；workflow 路径提交 exact stored candidate artifact。

### Backend -> Frontend

- SSE 事件类型由 `packages/shared/src/sse.ts` 定义。
- 当前事件包括 `heartbeat`、`agent_run_started`、`agent_run_attempt`、`agent_run_completed`、`assistant_message`、`a2ui_messages`、`surface_snapshot`、`agent_run_failed`、`agent_trace_event`、`workflow_started`、`workflow_step_updated`、`workflow_artifact_created`、`workflow_completed` 和 `workflow_failed`。
- `a2ui_messages` 和 `surface_snapshot` 只在 committed A2UI run 中出现。
- `agent_trace_event` 实时推送 ReAct 循环进度（iteration_started / model_action / tool_call / observation / final_validation）。
- Workflow artifact（clarification form、Markdown plan、decision form、candidate、validation report）用于前端 WorkflowPanel 恢复 timeline 和交互表单。

### Frontend -> Renderer

- Frontend 只向 Renderer 输入后端 committed A2UI messages 或由 current snapshot 还原的 messages。
- Renderer 内部的 `SurfaceGroupModel` 只在 `PreviewPanel.vue` 内部存在。
- 历史恢复使用 current snapshot 还原，不依赖前端重新回放全部历史 events。

### Renderer -> Backend

- Renderer 不直接调用后端。
- Renderer 通过浏览器事件 `a2ui:action` 和 `a2ui:error` 通知宿主前端。
- Frontend 校验事件为 A2UI v0.9 client message 后调用 `/renderer/action` 或 `/renderer/error`。
- Backend 当前只记录 Renderer event，不执行 `action.functionCall` 或业务副作用。

## 7. Snapshot 恢复约定

后端 snapshot 保存的是 `SurfaceSnapshotData`：

- `version`
- `surfaces[surfaceId].catalogId`
- `surfaces[surfaceId].components`
- `surfaces[surfaceId].dataModel`

前端恢复时按每个 surface 生成：

1. `createSurface`
2. `updateComponents`
3. `updateDataModel`，路径为 `/`

Renderer 收到 `replace` 变更时会销毁旧 `SurfaceGroupModel` 状态并全量重建。

## 8. 验收场景

- 首次输入自然语言后生成可渲染 UI。
- A2UI workflow intent 首次输入后，会生成 clarification form 或等待确认的 Markdown plan。
- `submit_clarification` 提交澄清答案后重新生成新版 plan 或新的 clarification form。
- `submit_decision(confirm)` 在 plan 阶段会启动 candidate 生成；成功时 workflow 进入 `preview`，并且 current snapshot 不变化。
- `submit_decision(revise)` 会生成新版 plan 或新的 clarification form，保留旧 artifact。
- candidate generation 失败时会产生 `validation_report` artifact，不提交正式 A2UI event。
- `submit_decision(confirm)` 在 preview 阶段提交已存 candidate artifact，而不是重新生成结果；提交后 current snapshot 才会变化。
- workflow task 运行期间，`agent_trace_event` 实时展示 ReAct 循环进度。
- 同一 workflow 的多次 task 之间，已披露的 Skill / Reference 通过 Resource Ledger 去重，不重复注入。
- Agent 请求 Skill、Skill Reference 或组件详情时，Runtime 面板能看到 tool calls。
- Agent 返回 TEXT_ONLY 时，只出现文本回复，预览不变化。
- Agent 校验失败后不提交 events 和 snapshot。
- 历史会话切换后 current snapshot 能恢复预览。
- Renderer action/error 能被后端记录。
- 导出完整会话、A2UI JSONL 和当前 snapshot。

## 9. 维护规则

- 修改端到端事件顺序时，同步更新 Backend、Frontend、Shared 和本文档。
- 修改 snapshot 数据结构时，同步更新 A2UI/Shared 契约、Backend snapshot service 和 Frontend 恢复逻辑。
- 修改 Renderer action 格式时，同步更新 A2UI 契约、Renderer、Frontend callback 和 Backend record API。

## 10. 相关文档

- [Frontend 模块说明](../frontend/README.md)
- [Renderer 模块说明](../renderer/README.md)
- [Backend 模块说明](../backend/README.md)
- [Agent 模块说明](../agent/README.md)
- [Shared 模块说明](../shared/README.md)
- [API 契约](../../../30-contracts/api.md)
- [A2UI v0.9 契约](../../../30-contracts/a2ui-v0.9.md)
- [DB Schema 契约](../../../30-contracts/db-schema.md)


