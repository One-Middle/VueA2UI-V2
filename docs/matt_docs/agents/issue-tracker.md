# Issue tracker: CYZ Local Markdown

Issues and specs for this repo live as Markdown files in `docs/matt_docs/scratch/`.

This is the Matt local markdown tracker with only the root path changed:

```text
.scratch/ -> docs/matt_docs/scratch/
```

## Conventions

- One feature per directory: `docs/matt_docs/scratch/<feature-slug>/`.
- The spec is `docs/matt_docs/scratch/<feature-slug>/spec.md`.
- Implementation issues are one file per ticket at `docs/matt_docs/scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
- Never publish a single combined tickets file.
- Triage state is recorded as a `Status:` line near the top of each issue file.
- Comments and conversation history append to the bottom of the file under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Create a new file under `docs/matt_docs/scratch/<feature-slug>/`, creating the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by a future CYZ fork of `/wayfinder`. The map is a file with one child file per ticket.

- **Map**: `docs/matt_docs/scratch/<effort>/map.md` - the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `docs/matt_docs/scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body.
- **Type**: a `Type:` line records `research`, `prototype`, `grilling`, or `task`.
- **Status**: a `Status:` line records `claimed` or `resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top.
- **Frontier**: scan `docs/matt_docs/scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer to `map.md`.

