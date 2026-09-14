# Backend modules

A Convex function is the unit of work. Custom builders bind workspace and trip
onto `ctx` before the handler runs, so handlers receive only new input.

```ts
export const run = mutableTripMutation({
  args: { input: TripDestinationValidators.stopInput },
  returns: v.id('tripDestinations'),
  handler: async (ctx, { input }) => addDestination(ctx, input)
});
```

`tripId` stays on the public args (the builder declares it). Clients do not
change. The handler uses `ctx.trip`, `ctx.workspace`, `ctx.role`, and `ctx.db`.

## Layers

1. **`schema.ts`** — tables and validators. No I/O. Root `convex/schema.ts`
   only spreads `*Tables`.
2. **Builders** — `workspaceQuery` / `workspaceMutation` / `tripMutation` /
   `mutableTripMutation`. This is the module’s access policy. Internal twins
   (`internalMutableTripMutation`, …) share the same `input` so assistant
   tools stay in one transaction.
3. **Helpers** — `(ctx, input)` where `ctx` is already bound. Extract only when
   a second caller needs the same write.
4. **Routes** — `routes/<domain>/` export `run`. They may use `ctx.db`.

Scheduled jobs have no user. Keep those on raw `internalAction` /
`internalMutation`. Do not globally replace `query` / `mutation`.

## Builders

| Builder | Bound on `ctx` | Extra public args |
| --- | --- | --- |
| `workspaceQuery` / `workspaceMutation` / `workspaceAction` | `workspace` | — |
| `tripQuery` / `tripMutation` | `workspace`, `trip`, `role` | `tripId` |
| `mutableTripMutation` | same, plus mutability checks | `tripId` |
| `destinationMutation` | same, plus `destination` | `tripId`, `destinationId` |

Stack by composing `input` helpers in `modules/travel/trips/ctx.ts`, not by inventing
entity classes or `(ctx, trip, workspace, role)` argument bags.

## Module shape

Each domain module is a folder of submodules. Do not add sibling `agent.ts`
next to `agent/`, or `model.ts` next to `model/`.

```
modules/travel/
  trips/  destinations/  activities/  stays/  transfers/  covers/
  issues/  packing/  preferences/  versions/  targets/  locations/  audit/
modules/assistant/
  agent/  model/  chat/  errors/  form/  registry/  screen/  tools/  validators/
modules/discussions/
  threads/  messages/  assistant/  media/
modules/media/
  library/  files/  attachments/
routes/trips/                # public run — api.routes.trips.* stays stable
```

Leaf modules with no subdomains (`auth/`, `ai/`, `organizations/`) stay as a
small set of files.

## Rules

- No entity classes, service classes, or `trips(ctx)` factories.
- `'use node'` files must not use `ctx.db`. Inspect, git, and LLM calls stay in
  actions; writes go through `internalMutation`.
- Outside a kinds folder, import the facade (`TripTargets`), never the kind map.
