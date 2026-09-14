# Groam AI architecture

```text
ai-contracts (what exists) → backend (what executes)
           ↘ ui/src/ai (what renders)
```

## Add an agent

1. Add its id in `src/agents/registry/ids.ts`.
2. Create `src/agents/registry/kinds/<id>.ts`.
3. Attach it once in `src/agents/registry/kinds/index.ts`.

The kind file owns identity, policies, surface, and allowed capabilities.

## Add a capability/tool

1. Add its dotted id in `src/agents/registry/ids.ts`.
2. Create the executable kind in
   `../backend/assistant/tools/kinds/<tool>.ts`.
3. Attach it once in that folder's `index.ts`, then add the id to the relevant
   agent kind's `capabilities`.

Shared Convex write helpers stay beside the runtime in
`backend/assistant/tools/trips/`.

## Add assistant UI

1. Create it in `../ui/src/ai/<area>/<component>.tsx`.
2. Export it from `../ui/package.json`.
3. Import it through `@groam/ui/ai/<area>/<component>`.

Use `src/output/kinds/` for a new model-emitted form component. Provider ids and
validated settings live in `src/providers/`; provider SDK construction lives in
the backend.
