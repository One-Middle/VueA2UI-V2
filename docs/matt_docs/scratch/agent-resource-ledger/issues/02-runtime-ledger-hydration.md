# 02 - Runtime Ledger Hydration

**What to build:** Add runtime Resource Ledger helpers that create, hydrate, dehydrate, and key disclosed Skill and Skill Reference resources.

**Blocked by:** 01 - Shared Resource Ledger Contract.

**Status:** ready-for-agent

- [ ] Runtime can create an empty Resource Ledger.
- [ ] Runtime can hydrate disclosed Skills from snapshot metadata and enabledSkills.
- [ ] Runtime can hydrate disclosed Skill References from snapshot metadata and enabledSkills.
- [ ] Runtime can dehydrate a Resource Ledger back to a content-free snapshot.
- [ ] Hydration misses are returned as debug diagnostics without creating Agent Observations.
