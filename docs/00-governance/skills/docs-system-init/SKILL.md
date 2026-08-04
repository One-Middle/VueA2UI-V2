---
name: docs-system-init
description: Initialize or migrate a software project's documentation system using a six-layer AI Coding documentation model. Use when asked to design docs structure, bootstrap docs for a new repository, migrate old docs, define truth sources, create documentation templates, or update project AGENTS.md documentation governance rules.
---

# Docs System Init

## Purpose

Use this skill to initialize or migrate a project documentation system. The target system separates product, design, contracts, implementation, delivery, and notes so both humans and AI coding agents can identify truth sources quickly.

## Core Model

Use this structure unless the repository has stronger existing conventions:

```text
docs/
  README.md
  CHANGELOG.md
  00-governance/
  10-product/
  20-design/
  30-contracts/
  40-implementation/
  50-delivery/
  90-notes/
```

Layer meanings:

- `00-governance/`: documentation rules, taxonomy, reading paths, writing rules.
- `10-product/`: product vision, requirements, roadmap, user-facing scope.
- `20-design/`: architecture, module target design, ADRs.
- `30-contracts/`: API, DB, events, A2UI, shared types; highest cross-module truth source.
- `40-implementation/`: mirror of real source code; no speculation.
- `50-delivery/`: task planning, progress, results, operations.
- `90-notes/`: learning notes, investigations, AI explanations, archive; not a truth source.

## Workflow

1. Inspect existing repository structure and docs before editing.
2. Read `AGENTS.md` or project-specific agent rules if present.
3. Classify existing docs by purpose, not by current folder name.
4. Build a migration map from old paths to the six-layer model.
5. Create missing layer indexes and governance documents.
6. Move or rewrite documents into their target layer.
7. Update root docs entry, reading paths, and AGENTS.md.
8. Search for stale old paths and fix current truth-source links.
9. Preserve historical material under `90-notes/archive/` unless the user asks to delete it.
10. Summarize moved, rewritten, archived, intentionally untouched, and unresolved items.

## Required References

Load references only when needed:

- `references/six-layer-structure.md`: exact structure and truth-source rules.
- `references/document-templates.md`: recommended templates for layer and module docs.
- `references/agents-md-snippet.md`: AGENTS.md documentation governance snippet.
- `references/migration-checklist.md`: migration checklist and validation steps.

## Rules

- Do not treat notes or archive files as current implementation truth.
- Do not put planned behavior into `40-implementation/`.
- Do not put long implementation explanations into `30-contracts/`.
- When current code and docs conflict, update the correct truth source and mention the conflict.
- For large migrations, prefer moving old docs into the new structure over copying duplicate truth sources.
