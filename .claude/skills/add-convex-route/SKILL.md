---
name: add-convex-route
description: >-
  Add a public Convex function under packages/backend/convex/routes as
  `export const run`. Use when exposing a new query, mutation, or action to
  the client (api.routes.*). Not for schema, helpers, or scheduled jobs
  (use add-backend-module).
---

# Add a public Convex route

One public function per file:
`packages/backend/convex/routes/<domain>/<operation>.ts` exporting `run`. The
path is the API name: `routes/trips/issues/create.ts` →
`api.routes.trips.issues.create.run`.

Read `packages/backend/convex/_generated/ai/guidelines.md` before writing
Convex code.

## Pick a builder

Builders bind auth onto `ctx` so handlers never thread argument bags.

| Builder | From | Bound on `ctx` | Extra public args |
| --- | --- | --- | --- |
| `workspaceQuery` / `workspaceMutation` / `workspaceAction` | `#convex/modules/auth/workspace` | `workspace` | — |
| `tripQuery` / `tripMutation` | `#convex/modules/travel/trips/ctx` | `workspace`, `trip`, `role` | `tripId` |
| `mutableTripMutation` | same | plus mutability checks | `tripId` |
| `sharedTripQuery` / `sharedTripMutation` | same | the shared trip (a draft id resolves to its source) | `tripId` |
| `destinationMutation` | same | plus `destination` | `tripId`, `destinationId` |

Scheduled and `'use node'` jobs stay on raw `internalAction` /
`internalMutation` in a module, not under `routes/`.

## Thin handler

Args and returns use validators from the domain `schema.ts`; the handler
calls a module helper.

```ts
import { v } from 'convex/values';
import { TripIssues } from '#convex/modules/travel/issues/index';
import { TripIssueValidators } from '#convex/modules/travel/issues/schema';
import { tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: TripIssueValidators.createInput,
  returns: v.id('tripIssues'),
  handler: (ctx, { body, title }) => TripIssues.create(ctx, ctx.trip._id, title, body)
});
```

Import with `#convex/...` and `#convex-generated/...` inside
`packages/backend`. `ctx.db` is allowed in routes and modules only.

## Finish

- `vp run codegen:convex` (or a running `just dev`) regenerates
  `api.routes.*`.
- Cover it with `add-convex-test`; consume it in the web app with
  `add-feature-hook`.

## Do not

- Export more than `run` from a route file.
- Read `process.env`; use the generated `env` from `#convex-generated/server`.
- Put `ctx.db` in a `'use node'` file — do I/O there, write via
  `internalMutation`.
