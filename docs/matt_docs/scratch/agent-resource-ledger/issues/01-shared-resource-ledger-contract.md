# 01 - Shared Resource Ledger Contract

**What to build:** Define the shared Resource Ledger Snapshot contract so Agent Runtime and WorkflowService can exchange cross-task resource state explicitly.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] Shared types describe disclosed Skill snapshot entries without content.
- [ ] Shared types describe disclosed Skill Reference snapshot entries without content.
- [ ] AgentWorkflowTaskInput accepts an optional Resource Ledger Snapshot.
- [ ] AgentWorkflowTaskResult returns an updated Resource Ledger Snapshot.
- [ ] The contract documents that snapshot content is hydrated from enabledSkills, not persisted in metadata.
