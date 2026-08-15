# 02 - Runtime types and action parser

**构建内容：** 新增 ReAct runtime 内部类型和严格 JSON action parser，让 LLM 每轮只能输出一个 `AgentModelAction`。

**阻塞关系：** 01 - Shared trace and SSE contract.

**Status:** planned

## Scope

- 新增 `packages/agent/src/runtime/react-agent-types.ts`。
- 定义 `ReactAgentRunInput`、`AgentRunGoal`、`AgentRunFact`、`AgentCapabilities`、`AgentObservation`、`AgentFinalArtifact`、`ReactAgentRunResult`、`AgentTraceEvent` 等内部类型。
- 新增 `packages/agent/src/runtime/react-action-parser.ts`。
- parser 只接受严格 JSON object。
- parser 支持 `tool_call`、`final_draft`、`give_up`。
- parser 拒绝 observation、Markdown、旧 tool-call 文本协议和多 action 输出。
- parser 错误返回结构化 parse failure，供 executor 转为 system observation。

## Acceptance Criteria

- [ ] 合法 `tool_call` JSON 能解析为 `AgentModelAction`。
- [ ] 合法 `final_draft` JSON 能解析为 `AgentModelAction`。
- [ ] 合法 `give_up` JSON 能解析为 `AgentModelAction`。
- [ ] 非 JSON、数组、缺字段、未知 `type`、多 action 输出都会返回 parse failure。
- [ ] parser 不依赖数据库、WorkflowService 或 ModelClient。

## Out Of Scope

- 不调用模型。
- 不执行工具。
- 不做 final artifact 业务校验。

