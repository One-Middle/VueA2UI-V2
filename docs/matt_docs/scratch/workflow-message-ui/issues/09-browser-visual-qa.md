# 09 — Browser Visual QA

**What to build:** Verify the new workspace visually in the browser so the two-column layout, Workflow progress, AI Workflow Message, inline forms, and component display feel coherent together.

**Blocked by:** 01 — Workspace Two-Column Shell, 02 — Workflow Progress In Conversation Header, 03 — Workflow Message Aggregation, 04 — Inline Workflow Forms, 05 — Fold WorkflowAction Feedback, 06 — Artifact Summaries In Workflow Message, 07 — Workflow Failure And Retry Inline, 08 — Conversation Rendering Tests.

**Status:** ready-for-agent

- [ ] The conversation tab visibly has two primary columns and no middle Workflow panel.
- [ ] The left-right structure remains intact on a narrow viewport.
- [ ] Workflow progress is readable above the conversation.
- [ ] AI Workflow Message step logs are readable and do not look like an admin timeline.
- [ ] Inline clarification and decision forms fit inside the message bubble without clipping or overflow.
- [ ] Artifact summaries are compact and expandable without overwhelming the conversation.
- [ ] The component display area still renders preview, component JSON, and dataModel JSON.
