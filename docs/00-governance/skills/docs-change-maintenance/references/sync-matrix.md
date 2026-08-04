# Documentation Sync Matrix

| Change type | Required docs |
| --- | --- |
| User-facing capability | `10-product/`, `40-implementation/`, maybe `20-design/`, `CHANGELOG.md` |
| Architecture or module responsibility | `20-design/`, affected `40-implementation/`, `CHANGELOG.md` |
| API request/response | `30-contracts/api.md`, frontend/backend implementation docs |
| SSE or event payload | `30-contracts/api.md` or `30-contracts/events.md`, frontend/backend implementation docs |
| DB schema or transaction boundary | `30-contracts/db-schema.md`, backend implementation docs |
| A2UI message or Basic Catalog contract | `30-contracts/a2ui-v0.9.md`, agent/renderer implementation docs |
| Shared TypeScript type | `30-contracts/shared-types.md`, affected module implementation docs |
| Module file structure or runtime flow | `40-implementation/modules/<module>/README.md` |
| Dev command, env var, or runtime operation | `50-delivery/operations/` |
| Multi-step delivery work | `50-delivery/planning/<topic>/` |
| Investigation or learning summary | `90-notes/` |

Stable facts created in `50-delivery/` must be backfilled to long-term docs before closeout.
