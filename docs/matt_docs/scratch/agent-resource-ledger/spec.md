# Agent Resource Ledger for ReAct Runtime

Status: ready-for-agent

## Problem Statement

当前 ReAct Agent Runtime 在多轮调用 `getSkillContent` 和 `getSkillReferenceContent` 后，会把完整 Skill 或 Skill Reference 正文放进 Agent Observation，并由 PromptComposer 每轮全量回放所有 observations。一次 workflow task 中只要重复读取 reference，prompt 上下文就会持续膨胀到 90000+ 字符。

从用户视角看，Agent 已经读过的资料会反复占用上下文，模型还可能重复请求同一个 reference。系统缺少一个结构化方式表达“当前 workflow 已经掌握哪些资源”，只能依赖模型从历史文本日志中自行判断，稳定性差。

## Solution

引入 Resource Ledger 作为 Agent Workflow 的 working memory。Resource Ledger 记录已披露 Skill 和 Skill Reference，并通过 Resource Ledger Snapshot 存放在 AgentWorkflow metadata 中，实现同一 workflow/session 内跨 task 共享。

Agent Runtime 每次执行 workflow task 前，从 Resource Ledger Snapshot 和当前 enabledSkills 执行 Hydration，恢复带正文的运行时 Resource Ledger。ToolRegistry 执行 `getSkillContent` 和 `getSkillReferenceContent` 时写入 ledger 并做去重。PromptComposer 从 ledger 生成 Working Resources 分区，将已获取资源一次性注入 prompt。Agent Observation 只保留事件摘要和小型白名单 details，不再承载正文。

## User Stories

1. As a frontend developer, I want Agent Runtime to avoid replaying full Skill content in every observation, so that prompt context does not grow uncontrollably during ReAct loops.
2. As a frontend developer, I want repeated `getSkillContent` calls for the same Skill to be detected structurally, so that the Agent receives a clear no-new-resource result.
3. As a frontend developer, I want repeated `getSkillReferenceContent` calls for the same reference to be deduplicated, so that model behavior does not depend on reading historical text logs.
4. As a frontend developer, I want partially repeated reference requests to disclose only new references, so that wildcard and batch calls remain useful.
5. As a frontend developer, I want Skill content and Skill Reference content to appear under Working Resources, so that the model has direct access to current resources without observation replay.
6. As a frontend developer, I want observations to summarize what was received, so that prompt history remains readable and event-oriented.
7. As a frontend developer, I want `observation.details` to keep small structured fields, so that validation errors and resource keys remain visible without injecting full content.
8. As a frontend developer, I want the Resource Ledger to survive across workflow tasks, so that planning and generation can share previously disclosed resources.
9. As a frontend developer, I want workflow metadata to store only resource keys and metadata, so that database records do not duplicate large Skill or reference bodies.
10. As a frontend developer, I want Hydration to restore resource content from enabledSkills, so that prompt injection uses the current authoritative Skill source.
11. As a frontend developer, I want Hydration misses to be recorded in debug metadata, so that inconsistent snapshots can be diagnosed without distracting the model.
12. As a frontend developer, I want `getSkillContent` to reveal reference metadata but not reference bodies, so that progressive disclosure remains explicit.
13. As a frontend developer, I want PromptComposer to order Skills before References, so that the model reads general instructions before detailed supporting material.
14. As a frontend developer, I want Resource Ledger Snapshot to be shared between backend and agent packages through shared types, so that the metadata contract is explicit.
15. As a frontend developer, I want AgentWorkflowTaskResult to return the updated Resource Ledger Snapshot, so that WorkflowService can persist it after each task.
16. As a frontend developer, I want trace to remain event-focused, so that audit and live progress do not become a second prompt resource store.
17. As a frontend developer, I want component details to remain out of scope for this first pass, so that the fix targets the current Skill/reference context bloat.

## Implementation Decisions

- Add shared Resource Ledger Snapshot types for disclosed Skills and disclosed Skill References.
- Store Resource Ledger Snapshot in AgentWorkflow metadata under `resourceLedger`.
- Snapshot stores resource keys and metadata only, not full content.
- Runtime Resource Ledger uses map-like structure keyed by `skill:<skillId>` and `reference:<skillId>:<referenceId>`.
- Hydration rebuilds runtime Resource Ledger from the snapshot and current enabledSkills.
- Hydration silently drops snapshot entries that cannot be resolved and reports them through debug metadata.
- AgentWorkflowTaskInput accepts an optional Resource Ledger Snapshot.
- AgentWorkflowTaskResult returns the updated Resource Ledger Snapshot and any dropped resource diagnostics in debug metadata.
- ToolRegistry receives execution context containing the current Resource Ledger.
- `getSkillContent` writes newly disclosed Skill content to Resource Ledger and returns a lightweight observation.
- `getSkillContent` returns completed for duplicate Skill requests and explains that the resource is already available in Working Resources.
- `getSkillContent` only returns reference metadata, not reference bodies.
- `getSkillReferenceContent` supports `*`, id, and title matching while disclosing only new references.
- `getSkillReferenceContent` returns completed for fully duplicate requests.
- ReactPromptComposer injects a Working Resources section from Resource Ledger.
- Working Resources are ordered with Skills first, then Skill References; each group preserves disclosure order.
- ReactPromptComposer no longer blindly stringifies observation details.
- Observation detail rendering is restricted to small whitelisted fields describing what was received or validated.
- `getCatalogComponentDetails` is not included in Resource Ledger for this first version.
- No single-resource or total-resource character budget is introduced in this version.

## Testing Decisions

- Tests should verify external Agent Runtime behavior through ToolRegistry, PromptComposer, WorkflowAgentExecutor, and AgentRuntime seams rather than private map mutation details.
- ToolRegistry tests should cover first disclosure, duplicate Skill disclosure, first reference disclosure, partial duplicate reference disclosure, wildcard reference disclosure, and observation payloads that exclude full content.
- PromptComposer tests should cover Working Resources rendering order and prove large `details` content is not stringified into observations.
- Resource Ledger helper tests should cover snapshot hydration, dehydration, missing Skill drops, and missing Reference drops.
- WorkflowAgentExecutor tests should cover passing the same Resource Ledger through multiple ReAct iterations.
- AgentRuntime tests should cover Resource Ledger Snapshot input, result output, and debug metadata for dropped resources.
- Backend WorkflowService tests should cover reading `metadata.resourceLedger` before runtime execution and writing back the returned snapshot.
- Existing tests around progressive disclosure and workflow execution are prior art for these behaviors.

## Out of Scope

- Character budget control for individual resources or total Working Resources.
- Component detail storage in Resource Ledger.
- Persisting full Skill or Skill Reference content in workflow metadata.
- Changing Agent Trace Event into a full content audit log.
- Cross-workflow or cross-session Resource Ledger sharing.
- User-facing UI changes for displaying Resource Ledger contents.

## Further Notes

This change separates event history from working memory. Trace records what happened, Resource Ledger records what the workflow currently knows, PromptComposer decides what the model sees, and ToolRegistry controls permissions plus repeat calls.
