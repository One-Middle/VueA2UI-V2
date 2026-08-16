# 04 - Working Resources Prompt Composition

**What to build:** Update ReactPromptComposer to render Working Resources from Resource Ledger and keep observations event-oriented.

**Blocked by:** 03 - ToolRegistry Resource Disclosure.

**Status:** ready-for-agent

- [ ] PromptComposer renders a Working Resources section when Resource Ledger has disclosed resources.
- [ ] Skills render before Skill References.
- [ ] Each resource group preserves disclosure order.
- [ ] Observation rendering includes messages and only whitelisted small detail fields.
- [ ] Observation rendering no longer blindly serializes arbitrary details.
- [ ] Tests prove full Skill or Skill Reference content is not repeated through observation details.
