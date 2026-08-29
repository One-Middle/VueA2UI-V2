# Renderer uses plain UI components and RenderNode

Status: Accepted

Renderer will render the Basic Catalog through plain Vue UI components that do not know A2UI, with a lightweight internal RenderNode layer between A2UI component models and Vue VNodes. This keeps A2UI protocol parsing centralized in Renderer while making the UI component library reusable, testable, and independent from `ComponentModel`, `DataContext`, `componentContextKey`, and `A2uiComponent`.

## Context

The legacy Basic components mix ordinary UI rendering with A2UI protocol work. Components read injected A2UI context, resolve `{ path }`, dispatch `action`, write to `DataModel`, and recurse through `A2uiComponent`.

The refactor also removes `Modal` from the new officially supported Basic Catalog. Future Agent prompts and validation should not expose `Modal`, so the new Renderer path does not need a `Modal` implementation or a legacy fallback.

## Decision

- Create a new ordinary Vue component library for the officially supported Basic Catalog, excluding `Modal`.
- Keep legacy Basic components in the repository as reference, but do not use them from the new Renderer path.
- Use a TypeScript Basic Catalog definition as the single source of truth for component names, field schema, and field semantics, then derive JSON Schema for validation.
- Do not introduce gray states such as `availableToAgent` or `implementedByRenderer`; the Catalog represents the unified supported set.
- Build a lightweight `RenderNode` tree from `ComponentModel` and `DataModel`, then render it to Vue VNodes.
- Keep `RenderNode.meta` with `surfaceId`, `componentId`, and `basePath` for Renderer diagnostics, action source, and List item scope.
- Put A2UI protocol handling in Renderer resolvers: `resolveProps`, `resolveModelBindings`, `resolveActionBindings`, and `resolveSlots`.
- Express `List` and `Tabs` special structure through Catalog slot rules handled by `resolveSlots`, not through per-component adapters.
- Use dependency-collected tree rebuild: collect exact data paths while building RenderNode, subscribe at the surface level with `watch`, and rebuild the tree when those paths change.

## Considered Options

- Keep using `A2uiComponent.vue` and `componentContextKey`. This preserves the current path but keeps A2UI protocol knowledge inside UI components.
- Generate Vue VNodes directly from A2UI. This is shorter but gives up a testable and inspectable protocol parsing result.
- Add one adapter per component. This is explicit but duplicates resolver behavior across mostly declarative components.
- Add Catalog gray states. This supports rollout flexibility but adds governance complexity before the project needs it.
- Use coarse surface-level data revision only. This is simple but loses dependency precision already present in the current renderer behavior.

## Consequences

- Renderer gains a new internal model and resolver layer before Vue rendering.
- Most components become declarative mappings from Catalog field semantics to ordinary Vue props/events/slots.
- `List` and `Tabs` remain ordinary UI components; their A2UI-specific structure is expanded before rendering.
- Agent prompt generation, validation schema, Renderer registry, and docs must stay aligned with the TypeScript Catalog definition.
- `Modal` will no longer be generated or validated as part of the official Basic Catalog, although old source files may remain as historical reference.
- Performance should remain controlled through exact dependency collection, while implementation avoids per-node renderer lifecycle management in the first version.
