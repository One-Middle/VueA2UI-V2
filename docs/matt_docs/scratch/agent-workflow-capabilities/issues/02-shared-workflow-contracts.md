# 02 - Shared workflow contracts

**构建内容：** 定义 Agent Workflow state、steps、artifacts、actions 和 workflow SSE events 的跨模块类型，使后端和前端可以使用同一份契约。

**阻塞关系：** 01 - Workflow persistence foundation.

**Status:** resolved

- [x] Shared DTOs 描述 Agent Workflow、Workflow Step、Workflow Artifact、workflow action requests 和 workflow action responses。
- [x] Shared contracts 区分 Agent 内部结果和 API 输出：前端只接收 API Output DTO，workflow artifacts 只保存 parsed/validated 后的业务产物。
- [x] WorkflowAction contracts 只描述用户或前端推进 workflow 的 HTTP/API 操作，不复用 AgentTool 命名。
- [x] Shared SSE types 包含 `workflow_started`、`workflow_step_updated`、`workflow_artifact_created`、`workflow_completed` 和 `workflow_failed`。
- [x] Artifact kinds 包含 `clarification_form`、`plan_markdown`、`candidate_a2ui_messages` 和 `validation_report`。
- [x] Workflow 和 step status unions 与 spec 词汇一致。
- [x] API 和 shared-type 文档已更新，包含新的 workflow contracts。
- [x] 当 workflow DTO 或 SSE payload 改变时，typecheck 能捕捉后端/前端漂移。
