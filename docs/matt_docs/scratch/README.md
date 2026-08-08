# Scratch

This directory is the CYZ path-mapped version of Matt's local markdown tracker.

```text
.scratch/<feature-slug>/ -> docs/matt_docs/scratch/<feature-slug>/
```

## Layout

```text
scratch/
  <feature-slug>/
    spec.md
    issues/
      01-<slug>.md
      02-<slug>.md
```

## Rules

- One feature per directory.
- `spec.md` stores the `cyz-to-spec` output.
- `issues/` stores the `cyz-to-tickets` output.
- Tickets must be numbered in blocker-first order.
- Do not duplicate product, contract, design, or implementation truth here; link to the relevant docs instead.

