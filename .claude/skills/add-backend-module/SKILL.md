---
name: add-backend-module
description: >-
  Add or extend a Convex domain module (schema fragment, builders, helpers)
  under packages/backend/convex/modules. Use when introducing a table, validator,
  or shared write — not when only adding a public route file.
---

# Add a backend module

Modules own tables and writes. Routes stay thin. See
`packages/backend/convex/modules/README.md`.

## Shape

```
packages/backend/convex/modules/<area>/<domain>/
  schema.ts     # tables + validators; no I/O
  index.ts      # plain helpers: (ctx, input) => ...
  ctx.ts        # custom builders, only if this domain binds extra ctx
```

Travel lives under `modules/travel/` (`trips`, `destinations`, `activities`,
`stays`, `issues`, `versions`, …). Assistant under `modules/assistant/`. Do
not add a sibling `issues.ts` next to `issues/`.

## Schema

1. Export `*Tables` and `*Validators` from `schema.ts`.
2. Spread `*Tables` into root `packages/backend/convex/schema.ts`. The root
   file only spreads fragments.
3. Index organization-scoped reads. Lists that can grow must paginate.

Better Auth already owns users, orgs, memberships. Application tables
store those string ids — do not duplicate user/org tables.

## Helpers

```ts
export async function create(ctx, tripId, title, body) { /* ctx.db.insert ... */ }
```

- Extract a helper only when a second caller needs the same write.
- No entity classes, service classes, or `trips(ctx)` factories.
- Stack builders by composing `input` helpers in `modules/travel/trips/ctx.ts`.
- Internal twins (`internalMutableTripMutation`, …) share the same `input` so
  assistant tools stay in one transaction.

Outside a kinds folder, import the facade (`TripIssues`), never the kind map.
