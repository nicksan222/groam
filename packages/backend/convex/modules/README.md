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
| `workspaceQuery` / `workspaceMutation` / `workspaceAction` (`auth/workspace.ts`) | `workspace` | — |
| `tripQuery` / `tripMutation` | `workspace`, `trip`, `role` | `tripId` |
| `mutableTripMutation` | same, plus mutability checks | `tripId` |
| `sharedTripQuery` / `sharedTripMutation` | same, for the shared trip view | `tripId` |
| `destinationMutation` | same, plus `destination` | `tripId`, `destinationId` |
| `previewTripQuery` / `previewSharedTripQuery` / `previewSharedTripMutation` | same, without a paid seat | `tripId` |

Trip builders require a seat on every trip created since seats were tracked, never for the
creator (`modules/payments`). The checks always run: the provider comes from `@groam/payments`,
and without `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` its pass provider gives every traveler
an already-paid seat. Preview builders serve the paywall: the redacted trip, the roster, the
viewer's own RSVP, and payment status. Organization-wide reads stay ungated. Every paid checkout
yields exactly a seat or a scheduled, idempotent refund.

Authentication email (`modules/auth/email.ts`) is optional the same way: with `RESEND_API_KEY` it is
queued on the Resend component from `AUTH_EMAIL_FROM` (default `Groam <onboarding@resend.dev>`, which only delivers to the Resend account owner's address,
so real use needs `AUTH_EMAIL_FROM` on a verified domain); without a key a local site writes the
message, links included, to the Convex function log, and a hosted site logs only an error. Without a key a hosted site also skips email verification
(`canSendEmail` in `modules/auth/verification.ts` is the single check) and rejects the mail-dependent
endpoints (password reset, verification resend, email change).

Trip builders live in `modules/travel/trips/ctx.ts`. Stack by composing `input` helpers there, not by inventing
new entity classes or `(ctx, trip, workspace, role)` argument bags.

## Module shape

Each domain module is a folder of submodules. Do not add sibling `agent.ts`
next to `agent/`, or `model.ts` next to `model/`.

```
modules/travel/
  trips/  destinations/  activities/  stays/  transfers/  covers/  issues/
  packing/  preferences/  versions/  targets/  locations/  travelers/  audit/
modules/assistant/
  agent/  model/  chat/  engine/  runs/  standalone/  waits/  errors/  screen/  validators/
modules/discussions/
  threads/  messages/  assistant/  media/  kinds/  links/  research/
modules/media/
  library/  files/  attachments/
modules/organizations/
  invitations/
modules/payments/            # trip seats, checkout, webhook, refunds (provider: @groam/payments)
modules/polls/               # polls and votes; writes signal poll waits
routes/<domain>/             # public run — api.routes.<domain>.* stays stable
```

`ai/` holds the provider and limits plus `chatgpt/` (the personal ChatGPT
connection). Leaf modules with no subdomains (`auth/`, `dev/`,
`notifications/`, `references/`) stay as a small set of files. Assistant tool implementations live
outside `convex/` in `packages/backend/assistant/tools/`.

Every agent run is one `@convex-dev/workflow` workflow (`assistant/engine/`):
`AgentEngine.start` / `cancel` own its lifecycle, the frozen `agentRun` body only
loops `turn` steps, and `onComplete` is the single writer of a run's terminal
status. Turns have no signed-in caller; internal builders accept `asRun` so a
turn's tools act for the run's creator (`requireActor` in `auth/workspace.ts`).
Runs no workflow owns (legacy runs, inline idea reviews, never-started chat
turns) are failed by the `sweepStaleRuns` cron. Rollback is forward-only: keep the
optional `agentRuns` fields and the `workflow` component mount, since unmounting
it orphans component data and in-flight runs.

## Rules

- New code uses plain functions and builders: no entity classes, service
  classes, or `trips(ctx)` factories. Class-based static facades still exist in
  `discussions/`, `media/`, `polls/`, `travel/targets/`, and `travel/versions/`
  (for example `Discussions`, `Messages`, `Media`, `Polls`, `TripTargets`,
  `TripVersions`); treat them as legacy exceptions and do not add more.
- `'use node'` files must not use `ctx.db`. Inspect, git, and LLM calls stay in
  actions; writes go through `internalMutation`.
- Outside a kinds folder, import the facade (`TripTargets`), never the kind map.
