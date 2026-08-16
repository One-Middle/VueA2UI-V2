# 08 — Conversation Rendering Tests

**What to build:** Automated tests cover the message aggregation and inline Workflow behaviors that define the new conversation experience.

**Blocked by:** 03 — Workflow Message Aggregation, 04 — Inline Workflow Forms, 05 — Fold WorkflowAction Feedback, 06 — Artifact Summaries In Workflow Message, 07 — Workflow Failure And Retry Inline.

**Status:** ready-for-agent

- [ ] Aggregation logic is tested with ordinary messages, workflow assistant messages, and workflow action messages.
- [ ] Message rendering tests show one AI Workflow Message per workflow.
- [ ] Clarification Form submission from inside a Workflow Message is covered.
- [ ] Decision Form submission from inside a Workflow Message is covered.
- [ ] WorkflowAction-created user messages are verified as folded or hidden from the main message stream.
- [ ] Plan and Validation Report summaries are verified as collapsed by default and expandable.
