# ReAct Agent Prompt And Validation Hardening

## Goal

Reduce workflow Agent validation loops caused by conflicting output protocols, weak Catalog field context, and non-actionable validation feedback.

The workflow path should make the model's job mechanically clear:

- Every model reply is one ReAct action envelope.
- A2UI candidate payload lives inside `final_draft.draft.messages`.
- Component field details are rendered as Catalog Context, not as long observation history.
- `validateA2UI` feedback is detailed enough for local repair.
- Safety checks distinguish browser-event injection from safe local script syntax.

## Problem

Recent Agent traces show repeated failures:

- parse errors because the model outputs non-envelope JSON or malformed JSON.
- Catalog property errors because components receive fields outside their schema.
- repair loops because validation feedback is summarized as generic Ajv text.
- false or ambiguous `UNSAFE_CONTENT` reports such as `"one ="`.

The current prompt stack mixes two final-output protocols:

- ordinary `run()` path: `{ assistantMessage, a2uiMessages }`
- workflow ReAct path: `{ type, finalKind, draft }`

The A2UI Skill still teaches the ordinary final output shape, so once the Skill enters Working Resources, the workflow model may see both protocols at the same time.

## Core Decisions

### Workflow output protocol

Workflow model output remains a single ReAct action envelope:

```json
{
  "type": "final_draft",
  "reasoningSummary": "生成候选 A2UI",
  "finalKind": "candidate_a2ui_messages",
  "draft": {
    "assistantMessage": "说明文本",
    "messages": []
  }
}
```

The workflow path must not accept `{ assistantMessage, a2uiMessages }` as the top-level model output. Ordinary `run()` may keep that shape until it is retired.

### Skill rendering

`builtin:a2ui-v0.9-generation` must be rendered differently in workflow prompts:

- It may still describe A2UI message rules.
- It must not instruct workflow models to output `{ assistantMessage, a2uiMessages }` as the top-level response.
- It should describe candidate payload placement as `final_draft.draft.messages`.

### Catalog Context

`getCatalogComponentDetails` returns generation constraints. The prompt should render them in a dedicated Catalog Context section.

Observations should keep only concise tool outcomes, for example:

```text
[4] 已获取组件详情：Column, Row, Text, TextField。
```

Catalog Context should be grouped by component and optimized for repair:

- allowed fields
- required fields
- enum values
- dynamic binding shapes
- common forbidden fields
- repair hints for common schema mistakes

### Validation feedback

`validateA2UI` failures should preserve structured diagnostics in observations:

- component ID
- component type
- message index and component path
- schema keyword
- extra property name for `additionalProperties`
- expected shape
- actual value summary
- repair hint

The executor may still show a short human summary in trace, but the model prompt should receive enough structure to repair the current draft.

### Safety validation

Safety validation should avoid scanning stringified messages with broad HTML-event patterns. In particular, `on\w+\s*=` over the entire JSON string can match harmless code fragments such as `one =`.

The validator should separate:

- unsafe HTML / URL string content
- forbidden component property names such as `onClick`
- restricted script code checks handled by JSRuntime / script-specific guards

## Affected Truth Sources

- `docs/20-design/agent/README.md`
- `docs/30-contracts/a2ui-v0.9.md`
- `docs/40-implementation/modules/agent/README.md`
- `packages/agent/src/runtime/react-prompt-composer.ts`
- `packages/agent/src/runtime/tool-registry.ts`
- `packages/agent/src/runtime/workflow-agent-executor.ts`
- `packages/agent/src/tools/validate-a2ui.ts`
- `packages/agent/src/skills/a2ui-v0.9-generation.ts`

## Acceptance Criteria

- Workflow prompts contain only one top-level final-output protocol.
- A2UI Skill content no longer conflicts with ReAct action envelope in workflow runs.
- Component details appear in Catalog Context and are not replayed as long observation details.
- Validation feedback tells the model which exact component field to remove or reshape.
- Safe script code containing variable names like `one =` does not trigger `UNSAFE_CONTENT`.
- Existing ordinary `run()` behavior remains documented and compatible.

## Out Of Scope

- Removing ordinary `run()`.
- Redesigning the full A2UI generation Skill content.
- Changing Renderer component behavior.
- Compressing or removing high-quality good case references.
