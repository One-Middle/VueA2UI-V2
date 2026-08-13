# 08 - Workflow timeline frontend

**构建内容：** 增加前端状态和 UI，用于恢复并展示完整 workflow timeline，包括 steps、Agent runs、tool calls、Skill 和 Reference disclosure、artifacts、failures 和 retries。

**阻塞关系：** 02 - Shared workflow contracts, 03 - WorkflowService skeleton.

**Status:** resolved

- [x] 打开 session 时，前端会加载 workflow history。
- [x] 前端监听 workflow SSE events，并更新 active session timeline。
- [x] Timeline rows 显示 workflow steps 和关联的 Agent runs。
- [x] Tool calls 和 Skill/Reference disclosure 默认折叠但可见。
- [x] Timeline 可以展示 AgentTool 调用记录和 debug metadata 摘要，但前端主工作区只消费 API Output 和 workflow artifacts。
- [x] Artifact creation、failure state、validation reports 和 retryable steps 会显示在 timeline 中。
- [x] Session switching 不会在 sessions 之间泄漏 workflow SSE events 或 stale timeline state。

## Implementation notes

- `workspace` store 加载 `listWorkflows()`，并消费 `workflow_started`、`workflow_step_updated`、`workflow_artifact_created`、`workflow_completed` 和 `workflow_failed` SSE events。
- `WorkflowPanel` 展示当前 workflow 的 steps、artifacts、失败报告和 candidate 状态；Runtime 面板继续展示 Agent runs 与 tool calls。
- `WorkflowPanel` 不直接渲染 Agent Output；Clarification Form、Markdown plan 和 Candidate preview 都来自 parsed/validated workflow artifacts。
- 现有 session revision guard 同样保护 workflow SSE，避免切换 session 后旧事件污染当前 timeline。
