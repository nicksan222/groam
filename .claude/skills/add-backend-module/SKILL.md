---
name: add-backend-module
description: >-
  Add or extend a Convex domain module (schema fragment, builders, helpers)
  under packages/backend/convex/modules. Use when introducing a table,
  validator, custom builder, or shared write — not when only adding a public
  route file (use add-convex-route).
---

# Add a backend module

Modules own tables and writes; routes stay thin. Read
`packages/backend/convex/_generated/ai/guidelines.md` and
`packages/backend/convex/modules/README.md` first.

## Shape

```
packages/backend/convex/modules/<area>/<domain>/
  schema.ts       # *Tables + *Validators; no I/O
  index.ts        # (ctx, input) helpers + one facade, e.g. TripIssues
  ctx.ts          # custom builders, only if this domain binds extra ctx
  <topic>.test.ts # colocated convex-test (add-convex-test)
```

Travel domains live under `modules/travel/` (`trips`, `destinations`,
`activities`, `stays`, `issues`, `versions`, …); assistant under
`modules/assistant/`. Leaf modules (`auth/`, `ai/`) stay a few flat files.
Never add a sibling `issues.ts` next to `issues/`.

## Schema

1. Export `<domain>Tables` and `<Domain>Validators` from `schema.ts`
   (see `modules/travel/issues/schema.ts`).
2. Import and spread the tables in `packages/backend/convex/schema.ts`; the
   root file only spreads fragments.
3. Index organization/trip-scoped reads. Lists that can grow paginate.

Better Auth owns users, orgs, and memberships. Store their string ids — never
add user/org tables.

## Helpers and facade

```ts
async function create(ctx: MutationCtx, tripId: Id<'trips'>, title: string, body: string) {
  // ctx.db.insert('tripIssues', …)
}

// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class TripIssues {
  static create = create;
}
```

- Helpers take an already-bound `ctx`; extract one only when a second
  caller needs the same write.
- The facade is a static-only namespace — no entity instances, service
  objects, or `trips(ctx)` factories.
- Builders (`tripQuery`, `mutableTripMutation`, `destinationMutation`, …)
  live in `modules/travel/trips/ctx.ts`; stack new ones by composing `input`
  helpers there. Internal twins (`internalMutableTripMutation`, …) share the
  same `input` so assistant tools stay in one transaction.
- Outside a `kinds/` folder, import the facade, never the kind map.
- `'use node'` files never touch `ctx.db`; write via `internalMutation`.

Expose the module to clients with `add-convex-route`; then run
`vp run typecheck` and `vp run test`.
