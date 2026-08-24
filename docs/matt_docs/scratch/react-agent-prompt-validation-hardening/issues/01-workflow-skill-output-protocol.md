# 01 - Workflow skill output protocol

**构建内容：** 统一 workflow ReAct 路径下的模型顶层输出协议，避免 A2UI Skill 注入旧 `{ assistantMessage, a2uiMessages }` 顶层格式。

**阻塞关系：** 无。

**Status:** completed

## Scope

- 调整 workflow prompt 中对 `builtin:a2ui-v0.9-generation` 的渲染方式。
- 明确 workflow 模型只能输出 `tool_call` / `final_draft` / `give_up` action envelope。
- 候选 A2UI 使用 `finalKind: "candidate_a2ui_messages"`，消息数组放入 `draft.messages`。
- 保留普通 `run()` 路径的 `{ assistantMessage, a2uiMessages }` 兼容说明。

## Acceptance Criteria

- [x] Workflow prompt 不再同时出现两个顶层 final output 协议。
- [x] A2UI Skill 在 workflow prompt 中说明 `draft.messages` 是候选消息位置。
- [x] 现有普通 `run()` 的 prompt 和解析行为不被破坏。
- [x] 单测覆盖 Skill 注入后 workflow prompt 的输出协议。

## Out Of Scope

- 不删除普通 `run()`。
- 不重写全部 Skill reference。
