# Six-Layer Documentation Structure

## Directory Layout

```text
docs/
  README.md
  CHANGELOG.md
  00-governance/
    README.md
    taxonomy.md
    maintenance.md
    reading-paths.md
    writing-rules.md
  10-product/
    README.md
    prd.md
    roadmap.md
    requirements/
  20-design/
    README.md
    overview.md
    system-design.md
    modules/
    decisions/
  30-contracts/
    README.md
    api.md
    db-schema.md
    events.md
    shared-types.md
  40-implementation/
    README.md
    modules/
  50-delivery/
    README.md
    operations/
    planning/
  90-notes/
    README.md
    archive/
```

## Truth Source Rules

- `10-product/`: product truth. Future behavior is allowed with status.
- `20-design/`: target design truth. Architecture and module intent live here.
- `30-contracts/`: highest truth for cross-module data interaction.
- `40-implementation/`: current code truth. Must be verified against source.
- `50-delivery/`: task-period truth. Stable facts must be backfilled.
- `90-notes/`: non-truth-source learning and historical material.

## Conflict Priority

1. Contracts beat implementation docs for cross-module data shape.
2. Implementation docs beat design docs for current code behavior.
3. Product docs beat delivery tasks for long-term product scope.
4. Notes never beat truth-source docs.
