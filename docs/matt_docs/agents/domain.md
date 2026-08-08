# Domain Docs

How the CYZ Matt skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `docs/matt_docs/CONTEXT.md`
- `docs/matt_docs/adr/` - read ADRs that touch the area you're about to work in.

If these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. `cyz-domain-modeling`, reached via `cyz-grill-with-docs`, creates them lazily when terms or decisions actually get resolved.

## File structure

This repo uses a single context:

```text
docs/matt_docs/
  CONTEXT.md
  adr/
    0001-example-decision.md
```

## Use the glossary's vocabulary

When your output names a domain concept in an issue title, refactor proposal, hypothesis, test name, or spec, use the term as defined in `docs/matt_docs/CONTEXT.md`.

Do not drift to synonyms the glossary explicitly avoids.

If the concept you need is not in the glossary yet, either reconsider whether you are inventing language the project does not use, or note the gap for `cyz-domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it.

