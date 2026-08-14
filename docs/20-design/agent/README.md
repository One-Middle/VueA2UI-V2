# Agent 模块边界

`packages/agent`

定位：受控 Agent Runtime，负责把上下文、工具和模型调用组织为可解析、可校验的结果。

## 负责

- 构建 Agent 上下文和 prompt。
- 调用 OpenAI-compatible API。
- 暴露受控 AgentTool，例如 `askClarification`、`askUserDecision`、`getSkillContent`、`getSkillReferenceContent`、`getCatalogComponentDetails` 和 `validateA2UI`。
- 记录工具调用过程，供后端持久化和 timeline 展示。
- 将 Agent Output 解析、归一化、校验为 Parsed Agent Result。
- 返回 clarification request、Markdown plan、candidate A2UI、decision form 或 failure。

## 不负责

- 直接写数据库。
- 直接提交正式 A2UI event 或 surface snapshot。
- 决定 workflow 能否推进到下一阶段。
- 开放 HTTP API。
- 前端渲染或会话 UI。

## 边界

- 由 `packages/backend` 编排调用。
- 使用 `packages/shared` 的 Agent、A2UI、DTO 和校验类型。
- raw Agent Output 只用于 debug / audit 摘要，不作为业务结果返回给前端主流程。
- Runtime 输出的是 Parsed Agent Result；WorkflowService 决定该结果在当前 gate 下是否合法。
