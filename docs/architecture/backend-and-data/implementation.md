# Backend and data implementation

This file describes how the decisions in the [backend and data
architecture](README.md) are implemented in `packages/backend/convex`: route
files, builder composition, the query, mutation and action split, schema and
component assembly, files, and bounded cleanup. The pseudocode is simplified
from the source; when the two disagree, the source wins.

## Route file pattern

Every public operation is one file under `convex/routes/<domain>/` that exports
`run`. Clients call it as `api.routes.<domain>.<file>.run`. A route declares
validators and delegates to a module helper. The builder it picks is its access
policy, so the route stays thin. Routes may use `ctx.db`, but shared writes
belong in modules.

```ts
// routes/trips/archive.ts
export const run = tripMutation({
  args: {},                       // tripId is declared by the builder
  returns: v.null(),
  handler: async (ctx) => archiveTrip(ctx)
});

// routes/trips/destinations/add.ts
export const run = mutableTripMutation({
  args: { input: TripDestinationValidators.stopInput },
  handler: (ctx, { input }) => TripDestination.add(ctx, input)
});
```

The generated `api` and `dataModel` under `convex/_generated` are the typed
contract, and `packages/backend/package.json` exports them to consumers.

Source: [routes/trips/archive.ts](../../../packages/backend/convex/routes/trips/archive.ts),
[routes/trips/destinations/add.ts](../../../packages/backend/convex/routes/trips/destinations/add.ts),
[modules/README.md](../../../packages/backend/convex/modules/README.md).

## Builder composition

Builders are `convex-helpers` custom functions. Each one declares its implicit
args and returns the context to bind. Trip builders stack by calling shared
loaders, not by subclassing: `loadTripContext` resolves the workspace and the
visible trip, `loadMutableTrip` adds `assertMutable`, and `destinationArgsInput`
adds the destination. The internal twins take the same input plus `asRun`, so
assistant tools reuse the policy inside one transaction.

```ts
const boundTrip = (loaded) => ({ role: loaded.role, trip: loaded.trip, workspace: loaded.workspace })

export const tripQuery = customQuery(query, {
  args: { tripId: v.id('trips') },
  input: async (ctx, { tripId }) => ({ args: {}, ctx: boundTrip(await loadTripContext(ctx, tripId)) })
})
export const mutableTripMutation = customMutation(mutation, {
  args: { tripId }, input: (ctx, { tripId }) => boundTrip(await loadMutableTrip(ctx, tripId))
})
export const internalMutableTripMutation = customMutation(internalMutation, {
  args: { tripId, asRun },
  input: (ctx, { asRun, tripId }) => boundTrip(await loadMutableTrip(ctx, tripId, await requireActor(ctx, asRun)))
})
// also: tripMutation, sharedTripQuery/Mutation, destinationMutation and internal twins
// workspace.ts: workspaceQuery/Mutation/Action, internalWorkspaceQuery/Mutation/Action
```

Handlers then call helpers shaped `(ctx, input)` with `ctx.trip`,
`ctx.workspace` and `ctx.role` already bound. There are no entity classes or
`(ctx, trip, workspace, role)` argument bags.

Source: [trips/ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L238),
[auth/workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L289).

## Query, mutation and action split

Queries read and subscribe. Mutations are the transaction boundary: writes
inside one handler commit together, and helpers such as `patchTrip` keep
related writes in the same transaction. Node-only work, such as git history,
runs in `'use node'` actions, which must not touch `ctx.db`. Scheduled jobs
have no user and stay on raw `internalMutation` / `internalAction`.

```ts
// patchTrip: one mutation, related writes together
await ctx.db.patch('trips', ctx.trip._id, { ...value, updatedAt: max(value.updatedAt, trip.updatedAt + 1) })
await invalidateIdeaReviewAfterEdit(ctx)
if (affectsConditions(value)) await syncTripConditions(ctx)   // budget, destination, duration, startDate
if (draft idea && !isSeedWrite()) await scheduleDraftTitleGeneration(ctx, ctx.trip._id)

// modules/travel/versions/git/action.ts
'use node';
export const createHistory = internalAction({ ... TripGit ... })   // no ctx.db
```

Source: [trips/ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L181),
[git/action.ts](../../../packages/backend/convex/modules/travel/versions/git/action.ts#L12),
[crons.ts](../../../packages/backend/convex/crons.ts).

## Actions commit through revalidating mutations

An action is not a transaction. It prepares state in a mutation, does the
external work, and commits in another mutation that validates again. Idea
merges record an operation `token` together with the `updatedAt` values they
expect. The finishing mutation rejects the result if the token or any of those
timestamps changed. Failures release the operation, but already completed
external side effects stay done. Draft title generation uses the same pattern
with a `generation` counter. ChatGPT refreshes use a `revision` plus a
`leaseId`.

```ts
async function runApprovedMerge(ctx, proposalId, asRun?) {
  prepared = runMutation(workflow.prepareMerge, { asRun?, proposalId })  // beginOperation: token = crypto.randomUUID()
  try {
    history = runAction(git.action.createHistory, prepared.history)      // Node, no db
    runMutation(workflow.finishMerge, { ...history, proposalId, token: prepared.token })
    return 'applied'
  } catch (error) {
    if (error.data.code === 'trip_merge_conflict') { runMutation(workflow.markConflict, { paths, token }); return 'conflicted' }
    runMutation(workflow.cancelOperation, { proposalId, token })   // deletes only if operation.token === token
    IdeaErrors.rethrow(error)
  }
}

finishMerge: if (operation?.kind !== 'merge' || operation.token !== token ||
                 operation.requestedBy.userId !== source.workspace.userId ||
                 operation.expected{Proposal,Source,Working}UpdatedAt changed)
               throw ConvexError('This idea can no longer be applied')
```

Source: [merge/action.ts](../../../packages/backend/convex/modules/travel/versions/merge/action.ts#L8),
[versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L171),
[versions/workflow.ts](../../../packages/backend/convex/modules/travel/versions/workflow.ts),
[title/action.ts](../../../packages/backend/convex/modules/travel/versions/agent/title/action.ts),
[chatgpt/storage.ts](../../../packages/backend/convex/modules/ai/chatgpt/storage.ts#L177).

## Schema assembly and component mounting

Each module owns a `schema.ts` that exports a `*Tables` fragment and, where
needed, a `*Validators` object. The root schema only spreads fragments.
Components are mounted in `convex.config.ts`, and `http.ts` composes the HTTP
routes.

```ts
// modules/notifications/schema.ts
export const NotificationValidators = { item, kind }
export const notificationTables = {
  workspaceNotifications: defineTable({ ... organizationId, userId ... })
    .index('by_organizationId_and_userId', ['organizationId', 'userId'])
}

// schema.ts
export default defineSchema({ ...chatGptTables, ...assistantRunTables, ...tripTables, /* ... */ })

// convex.config.ts
app.use(betterAuth); app.use(agent); app.use(geospatial)
app.use(rateLimiter); app.use(workflow)

// http.ts: backend HTTP endpoints; the Void frontend is hosted by Cloudflare
authComponent.registerRoutesLazy(http, createAuth, { cors: true, trustedOrigins })
http.route({ path: '/auth/chatgpt/callback', method: 'GET', handler: chatGptCallback })
```

Better Auth owns users, sessions, organizations and memberships in its local
component (`components/better-auth`). The Agent component owns thread
messages, and the Workflow component owns run journals. The modules README
requires keeping the `workflow` mount, because unmounting it orphans
in-flight runs.

Source: [schema.ts](../../../packages/backend/convex/schema.ts#L23),
[convex.config.ts](../../../packages/backend/convex/convex.config.ts),
[http.ts](../../../packages/backend/convex/http.ts#L10),
[notifications/schema.ts](../../../packages/backend/convex/modules/notifications/schema.ts).

## Domain module shape

Modules are folders of submodules (`modules/travel/trips/`,
`modules/discussions/threads/`, `modules/media/library/`). Leaf modules such as
`auth/`, `notifications/` and `references/` stay as a few files. A module
exports its schema fragment, builders and plain helpers. Kind-dependent logic
reads a policy map rather than `kind` literals. Some older static facades
remain (`Discussions`, `Media`, `Polls`, `TripTargets`, `TripVersions`); the
modules README treats them as legacy exceptions.

```ts
// modules/discussions/kinds/index.ts
conversationKinds = {
  group:    { audience: 'members', trip: 'optional', agentTrigger: 'mention', home: 'chats',     links: false },
  assistant:{ audience: 'owner',   trip: 'none',     agentTrigger: 'always',  home: 'assistant', links: false },
  research: { audience: 'trip',    trip: 'required', agentTrigger: 'mention', home: 'trip',      links: true }
}
kindPolicy(kind) = conversationKinds[kind]
```

Source: [modules/README.md](../../../packages/backend/convex/modules/README.md),
[kinds/index.ts](../../../packages/backend/convex/modules/discussions/kinds/index.ts#L17).

## Files and the media library

The client uploads bytes to Convex storage through a URL from
`Media.generateUploadUrl`. The public `routes/media/save` action then calls
`MediaCommit.saveFromUpload`. The action reads the first 16 bytes and checks
the magic-byte signature (`Files.inspect`), and the internal `commit.save`
mutation runs `Media.save`. `Media.save` re-resolves the workspace, enforces
size and type, and records organization ownership. Attachments and discussion
media point at `media` rows, and readers check the row's `organizationId`
instead of trusting a storage ID or URL.

```ts
MediaCommit.saveFromUpload(ctx, { contentType, name, storageId }):
  if (!(await ctx.auth.getUserIdentity())) throw ConvexError('Not authenticated')
  file = Files.inspect(ctx, storageId, contentType)            // { contentType, signatureValid }
  return ctx.runMutation(internal.modules.media.library.commit.save, { ...file, name, storageId })

Media.save(ctx, ...):
  workspace = requireWorkspace(ctx)
  existing = media.by_storageId(storageId)
  if (existing) return same org && existing.createdBy === workspace.tokenIdentifier
                  ? { mediaId, ok: true } : { error: 'The uploaded file is not available', ok: false }
  if (trip cover uses storageId) return { error: 'The uploaded file is already used as a trip cover', ok: false }
  metadata = ctx.db.system.get('_storage', storageId)
  invalid = Files.validationError(metadata.size, contentType, signatureValid)
    // 'Files must be 25 MB or smaller' | 'Upload a supported image, video, or PDF'
    // | 'The file contents do not match its media type'
  if (invalid) { ctx.storage.delete(storageId); return { error: invalid, ok: false } }
  insert media { contentType, createdBy: tokenIdentifier, name (<= 120), organizationId, size, storageId }

Media.delete(): refuse if group logo, pinned to a trip, or attached in a chat; then delete bytes and row
Media.page(ctx, paginationOpts): page size 1..50, media.by_organizationId, desc
  // scan at most 20 raw candidates, filter authorized media, retain continuation
routes/media/discover: continue long source histories with bounded, revalidated origin proofs
```

Source: [library/commit.ts](../../../packages/backend/convex/modules/media/library/commit.ts#L18),
[files/index.ts](../../../packages/backend/convex/modules/media/files/index.ts#L87),
[library/index.ts](../../../packages/backend/convex/modules/media/library/index.ts#L52),
[routes/media/save.ts](../../../packages/backend/convex/routes/media/save.ts).

## Deletion and bounded cleanup

Deletion follows references. Removing an itinerary target deletes its
attachment pins and its research links. Organization deletion runs from the
Better Auth `organization.onDelete` trigger as `removeOrganizationData`. Each
transaction removes one batch of one resource type and then reschedules itself
until nothing is left. Research removal sets `deletingAt` first, so readers
stop seeing the research immediately. It then purges up to
`INLINE_PURGE_STEPS` batches inline and continues in the background.

```ts
// organizations/cleanup.ts, DELETE_BATCH_SIZE = 50
run():
  if (removeNextTrip())            return continueInNextTransaction()  // deleteTripBatch on one trip
  if (removeDiscussionBatch())     return continueInNextTransaction()
  if (removePollBatch())           return continueInNextTransaction()
  if (removeMediaBatch())          return continueInNextTransaction()  // storage.delete + row
  if (removeInvitationCodeBatch()) return continueInNextTransaction()
  return null
continueInNextTransaction = scheduler.runAfter(0, internal.modules.organizations.cleanup.removeOrganizationData, args)

// target removal (versions/apply.ts, stays, transfers)
Attachments.removeTarget(ctx, tripId, target)          // delete references, then orphaned attachments
removeLinksForTargetKey(ctx, linkTargetKey(target))    // discussionLinks.by_targetKey, decrement linkCount

// research removal, PURGE_BATCH_SIZE = 50, INLINE_PURGE_STEPS = 6
patch discussions { deletingAt: Date.now() }
for (step < INLINE_PURGE_STEPS && more) more = Discussions.purge(ctx, research, PURGE_BATCH_SIZE)
if (more) scheduler.runAfter(0, internal.modules.discussions.threads.cleanup.purgeDiscussion, { discussionId })
// readers: DiscussionAccess.forWorkspace and Research.listForTrip skip rows with deletingAt
```

`Discussions.purge` first aborts runs in the chat, then removes polls,
messages with their media references, reactions, participation and links. The
Agent thread and the row go last. Lists use indexes scoped by organization,
trip or discussion, with explicit bounds such as `MAX_MESSAGES_PAGE_SIZE` (50),
`MAX_RUN_PAGE` (25) and `MAX_RESEARCHES_PER_TRIP` (100).

Source: [organizations/cleanup.ts](../../../packages/backend/convex/modules/organizations/cleanup.ts#L20),
[trips/index.ts](../../../packages/backend/convex/modules/travel/trips/index.ts#L221),
[research/index.ts](../../../packages/backend/convex/modules/discussions/research/index.ts#L171),
[threads/index.ts](../../../packages/backend/convex/modules/discussions/threads/index.ts#L809),
[links/cascade.ts](../../../packages/backend/convex/modules/discussions/links/cascade.ts#L18),
[attachments/index.ts](../../../packages/backend/convex/modules/media/attachments/index.ts#L202).

## Derived and historical records

Derived values are written by the owner of the source data. Issue conditions
re-sync when a trip patch touches budget, destination, duration or start date.
Membership changes trigger a paged re-sync of the group's trips. Activity and
destination coordinates go into the geospatial index through `TripLocations`.
Research rows keep `linkCount` and `participantCount`. The trip activity feed
(`tripAuditEvents`) is a capped recent history that is never replayed to
rebuild plans.

```ts
recordActivity(ctx, type, message):
  insert tripAuditEvents { actor, message, tripId, type }
  recent = tripAuditEvents.by_tripId desc take(MAX_ACTIVITY_ITEMS + 1)   // MAX_ACTIVITY_ITEMS = 30
  if (recent[MAX_ACTIVITY_ITEMS]) delete it

resync.organization({ cursor?, organizationId }):        // TRIPS_PER_PAGE = 25
  page = shared trips of the organization, paginate
  schedule resync.trip per non-archived trip; reschedule with continueCursor until isDone
```

Source: [trips/ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L199),
[issues/resync.ts](../../../packages/backend/convex/modules/travel/issues/resync.ts#L17),
[issues/sync.ts](../../../packages/backend/convex/modules/travel/issues/sync.ts),
[locations/index.ts](../../../packages/backend/convex/modules/travel/locations/index.ts).

## Invariants and tests

- Organization deletion removes trips, discussions, media and stored files:
  [delete.test.ts](../../../packages/backend/convex/modules/travel/trips/delete.test.ts).
- Organization cleanup removes media in bounded batches and leaves other
  groups intact: [cleanup.test.ts](../../../packages/backend/convex/modules/organizations/cleanup.test.ts).
- Media lists stay inside the organization; saved uploads cannot be claimed by
  another group or teammate; revoked members lose access:
  [media.authz.test.ts](../../../packages/backend/convex/modules/media/library/media.authz.test.ts).
- A research being removed is unreachable during the background purge, and
  removing an itinerary item removes its links and updates counts:
  [research.test.ts](../../../packages/backend/convex/modules/discussions/research/research.test.ts).
- Attachment pins follow their targets:
  [attachments.test.ts](../../../packages/backend/convex/modules/media/attachments/attachments.test.ts).
- Trip-owned rows cannot be edited or deleted through another trip:
  [ownership.test.ts](../../../packages/backend/convex/modules/travel/trips/ownership.test.ts).
- Membership changes re-sync issue conditions:
  [resync.test.ts](../../../packages/backend/convex/modules/travel/issues/resync.test.ts).
- Run and event pages stay bounded and organization-scoped:
  [runs.test.ts](../../../packages/backend/convex/modules/assistant/runs/runs.test.ts).

## Extending

- **New public operation:** add `routes/<domain>/<name>.ts` exporting `run`,
  built on the narrowest builder, with `args` and `returns` validators. See
  [add-convex-route](../../../.agents/skills/add-convex-route/SKILL.md).
- **New table or module:** add a `schema.ts` fragment (`*Tables`, optional
  `*Validators`) inside the owning module folder, spread it in `schema.ts`, and
  index every scoped read. Put new builders next to the resource. See
  [add-backend-module](../../../.agents/skills/add-backend-module/SKILL.md).
- **External or Node work:** keep it in an action and commit through an
  internal mutation that revalidates state (and a token if the work is long).
  Never use `ctx.db` in `'use node'` files.
- **Deletion:** extend the owning module's batch purge and the organization
  cleanup chain rather than deleting unboundedly in one transaction.
- **Configuration:** add deployment variables through
  [add-env-variable](../../../.agents/skills/add-env-variable/SKILL.md).
- **Tests:** use the shared factory and real routes via
  [add-convex-test](../../../.agents/skills/add-convex-test/SKILL.md).
