---
name: docs-change-maintenance
description: Maintain project documentation while adding features, modifying behavior, refactoring modules, or fixing bugs. Use when a coding task changes product behavior, architecture, APIs, database schema, events, A2UI contracts, shared types, module implementation, tests, or delivery plans and docs must stay synchronized.
---

# Docs Change Maintenance

## Purpose

Use this skill during feature work or project changes so documentation evolves with code. It tells Codex what to read before changing code, what docs to update while coding, and how to close the task without leaving stale truth sources.

## Decision Tree

Classify the change:

- Product behavior or user-facing capability -> update `10-product/`.
- Architecture, module responsibility, or technical direction -> update `20-design/`.
- API, DB, event, A2UI, shared type, or cross-module data shape -> update `30-contracts/`.
- Real code structure, entry point, runtime flow, state model, or tests -> update `40-implementation/`.
- Multi-step feature, refactor, migration, or fix -> update `50-delivery/planning/`.
- Learning notes or investigation notes -> write to `90-notes/`.

## Workflow

1. Read relevant product, design, contracts, implementation, and current delivery docs.
2. Inspect real source code before updating implementation docs.
3. If the task is non-trivial, create or update a delivery task directory.
4. Make code changes.
5. Update contracts before or together with cross-module data changes.
6. Update implementation docs after verifying final code shape.
7. Update product or design docs only when long-term scope or architecture changes.
8. Update delivery `progress.md`, `decisions.md`, and `result.md` as appropriate.
9. Update `CHANGELOG.md` for important user-facing, contract, architecture, or docs-system changes.
10. Validate links and search for stale old facts.

## Required References

Load references only when needed:

- `references/sync-matrix.md`: exact doc update matrix by change type.
- `references/delivery-task-template.md`: files and content for task planning.
- `references/closeout-checklist.md`: final validation checklist.

## Rules

- Never use notes as the source of current behavior.
- Never update `40-implementation/` without reading source code.
- Never change cross-module data shape without checking `30-contracts/`.
- Do not duplicate the same fact across layers unless one layer links to the truth source.
- If docs and code disagree, name the disagreement and update the correct truth source.
