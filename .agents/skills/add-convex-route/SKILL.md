---
name: add-convex-route
description: >-
  Add a public Convex function under packages/backend/convex/routes as export
  const run. Use when exposing a new query, mutation, or action to the client
  (api.routes.*). Not for schema, helpers, or scheduled jobs.
---

# Add a public Convex route

Each public function is one file: `packages/backend/convex/routes/<domain>/<operation>.ts`
exporting `run`. Nested domains match the URL-like path
(`routes/trips/issues/create.ts` → `api.routes.trips.issues.create.run`).

Before writing Convex code, read
`packages/backend/convex/_generated/ai/guidelines.md`.

## Pick a builder

Import builders from the owning module. They bind `workspace` / `trip` onto
`ctx` so the handler does not thread auth bags.

| Builder | Bound | Extra public args |
| --- | --- | --- |
| `workspaceQuery` / `workspaceMutation` / `workspaceAction` | `workspace` | — |
| `tripQuery` / `tripMutation` | `workspace`, `trip`, `role` | `tripId` |
| `mutableTripMutation` | plus mutability checks | `tripId` |
| `destinationMutation` | plus `destination` | `tripId`, `destinationId` |

Keep scheduled and `'use node'` jobs on raw `internalAction` /
`internalMutation`. Do not replace those with workspace builders.

## Thin handler

Args and returns use validators from the domain `schema.ts`. The handler calls
a `(ctx, input)` helper — it does not grow entity classes.

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

Use `#convex/modules/...` and `#convex-generated/...` inside the backend
package. `ctx.db` is allowed here.

## Do not

- Export multiple functions from one route file.
- Read `process.env`; Convex uses the generated `env` from `_generated/server`.
- Put `ctx.db` in a `'use node'` file — inspect/LLM there, write via
  `internalMutation`.
