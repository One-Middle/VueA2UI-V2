# 03 - ToolRegistry Resource Disclosure

**What to build:** Make ToolRegistry write Skill and Skill Reference tool results into Resource Ledger while returning lightweight observations.

**Blocked by:** 02 - Runtime Ledger Hydration.

**Status:** ready-for-agent

- [ ] ToolRegistry receives Resource Ledger through tool execution context.
- [ ] `getSkillContent` stores newly disclosed Skill content in Resource Ledger.
- [ ] `getSkillContent` returns completed for duplicate Skill requests without redisclosing content.
- [ ] `getSkillContent` exposes reference metadata but not reference bodies.
- [ ] `getSkillReferenceContent` stores only newly disclosed references in Resource Ledger.
- [ ] `getSkillReferenceContent` handles full and partial duplicate requests with completed observations.
- [ ] Skill and reference observations do not include full resource content.
