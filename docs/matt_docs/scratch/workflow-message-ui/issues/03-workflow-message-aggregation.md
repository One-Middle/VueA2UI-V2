# 03 — Workflow Message Aggregation

**What to build:** The message list groups assistant messages that belong to the same Agent Workflow into one AI Workflow Message, while ordinary messages keep their normal bubble behavior.

**Blocked by:** 02 — Workflow Progress In Conversation Header.

**Status:** ready-for-agent

- [ ] The message list computes display items from messages and workflows.
- [ ] Assistant messages sharing a workflowId render inside one AI Workflow Message.
- [ ] The Workflow Message appears at the position of the first relevant workflow assistant message.
- [ ] Non-workflow assistant messages render as ordinary assistant bubbles.
- [ ] Ordinary user-authored natural language messages render as ordinary user bubbles.
- [ ] reasoningSummary assistant messages appear as ordered step logs inside the AI Workflow Message.
