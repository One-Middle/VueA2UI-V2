# 05 - Workflow Metadata Persistence

**What to build:** Persist Resource Ledger Snapshot on AgentWorkflow metadata so disclosed resources are shared across workflow tasks.

**Blocked by:** 04 - Working Resources Prompt Composition.

**Status:** ready-for-agent

- [ ] WorkflowService reads Resource Ledger Snapshot from AgentWorkflow metadata before running a workflow task.
- [ ] WorkflowService passes Resource Ledger Snapshot into Agent Runtime.
- [ ] Agent Runtime returns the updated Resource Ledger Snapshot after workflow task execution.
- [ ] WorkflowService writes the returned snapshot back to AgentWorkflow metadata.
- [ ] Dropped hydration resources are included in debug metadata.
- [ ] Existing workflow task paths continue to preserve unrelated metadata fields.
