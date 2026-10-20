# Identity and access implementation

This file describes how the decisions in the [identity and access
architecture](README.md) are implemented: how a Convex call turns a Better Auth
session into a workspace, how builders bind trip context and roles, and how
agent turns act for a run's creator. The pseudocode is simplified from the
source; when the two disagree, the source wins.

## Session and membership resolution

Better Auth runs as a local Convex component. `auth.ts` configures it with the
username, passkey, two-factor, organization, cross-domain and Convex plugins,
and `http.ts` mounts its HTTP routes. Browsers connect through `@groam/auth`,
whose `GroamAuthProvider` wraps `ConvexBetterAuthProvider`. On the server,
`requireWorkspace` reads the session, user and active-organization membership
in a single component query (`components.betterAuth.workspace.access`) instead
of building a full Better Auth instance per call. Component triggers keep
app-owned records in sync when users, members or organizations are removed.

```ts
// components/better-auth/workspace.ts: one read for the guard
access({ sessionId, userId }):
  session, user = db.get(normalizeId(...)) // null if either is missing
  if (!session || !user || session.userId !== userId) return null
  member = member.by_organizationId_and_userId(session.activeOrganizationId, userId)
  return { activeOrganizationId, expiresAt: session.expiresAt, role: member?.role ?? null, userName }

// modules/auth/workspace.ts
async function requireWorkspace(ctx): Workspace {
  if (boundWorkspace(ctx)) return it          // same-call reuse, never a system workspace
  identity = await ctx.auth.getUserIdentity()
  if (!identity || typeof identity.sessionId !== 'string') throw ConvexError('Not authenticated')
  access = await ctx.runQuery(components.betterAuth.workspace.access, { sessionId, userId: identity.subject })
  if (!access || access.expiresAt <= Date.now()) throw ConvexError('Not authenticated')
  if (!access.activeOrganizationId) throw ConvexError('No active organization')
  if (access.role === null)       throw ConvexError('Organization access denied')
  return { organizationId, organizationRole: access.role, tokenIdentifier, userId: identity.subject, viewerName }
}

// modules/auth/auth.ts: component triggers
user.onDelete         -> internal.modules.ai.chatgpt.storage.removeUserConnections
member.onCreate       -> internal.modules.travel.issues.resync.organization
member.onDelete       -> resync.organization + discussions.threads.cleanup.removeOrganizationMember
organization.onDelete -> internal.modules.organizations.cleanup.removeOrganizationData
organization({ membershipLimit: ORGANIZATION_MEMBERSHIP_LIMIT /* 100 */, organizationLimit: 10 })
```

Organization managers are recognised by `isOrganizationManager`, which splits
the Better Auth role list on commas and accepts `admin` or `owner`.

Source: [workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L72),
[auth.ts](../../../packages/backend/convex/modules/auth/auth.ts#L32),
[better-auth/workspace.ts](../../../packages/backend/convex/components/better-auth/workspace.ts),
[http.ts](../../../packages/backend/convex/http.ts#L10),
[provider.tsx](../../../packages/auth/src/provider.tsx).

## Public workspace builders

Public functions never accept an organization or user argument. The workspace
builders are `convex-helpers` custom functions whose `customCtx` resolves the
workspace before the handler runs, so `ctx.workspace` is always server-derived.

```ts
const workspaceCtx = customCtx(async (ctx) => ({ workspace: await requireWorkspace(ctx) }))

export const workspaceQuery    = customQuery(query, workspaceCtx)
export const workspaceMutation = customMutation(mutation, workspaceCtx)
export const workspaceAction   = customAction(action, workspaceCtx)
```

Rosters follow the same rule: `workspaceRoster` lists members through Better
Auth (`limit: 100`) and throws `'Organization access denied'` if the caller is
not among them.

Source: [workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L289).

## Internal asRun builders and delegated actor

Agent turns run inside a workflow with no browser session. Internal builders
accept an optional `asRun` argument (`runActorArgs`). `requireActor` prefers a
real identity; only without one does it resolve the run's creator, and only
while the run's status is `running`. The creator's membership is re-read from
Better Auth on every call, so removing a member stops later resolutions,
including after a durable wait. Assistant tools never pick the run themselves:
`bindRunActor` wraps the tool context so every `runQuery`, `runMutation` and
`runAction` call carries `asRun: runId`.

```ts
export const runActorArgs = { asRun: v.optional(v.id('agentRuns')) }

async function requireActor(ctx, asRun?): Workspace {
  if (asRun === undefined || (await ctx.auth.getUserIdentity()) !== null)
    return await requireWorkspace(ctx)          // identity wins
  return await runActorWorkspace(ctx, asRun)
}

async function runActorWorkspace(ctx, runId) {
  actor = 'db' in ctx ? loadRunActor(ctx, runId)
                      : ctx.runQuery(internal.modules.auth.actor.load, { runId }) // actions
  if (!actor) throw ConvexError('Agent run is not active')
  member = betterAuth.adapter.findOne('member', { organizationId: actor.organizationId, userId: actor.userId })
  if (!member?.role) throw ConvexError('Organization access denied')
  return { ...actor, organizationRole: member.role, runId }
}

function loadRunActor(ctx, runId) {
  run = ctx.db.get('agentRuns', runId)
  if (run?.status !== 'running') return null   // terminal and waiting runs act for nobody
  return { organizationId: run.organizationId,
           tokenIdentifier: run.actorTokenIdentifier ?? run.createdBy.userId, // legacy runs
           userId: run.createdBy.userId, viewerName: run.createdBy.name }
}

internalWorkspaceQuery / Mutation / Action = custom*(internal*, { args: runActorArgs, input: requireActor })
internalOptionalActorMutation  // binds ctx.workspace only when asRun is passed
```

Public builders do not declare `asRun`, so a client cannot pass one.

Source: [workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L222),
[actor.ts](../../../packages/backend/convex/modules/auth/actor.ts),
[assistant/tools/index.ts](../../../packages/backend/assistant/tools/index.ts#L33).

## System and purpose-specific scope

Scheduled work uses raw `internalMutation` / `internalAction` functions that
take an explicit `organizationId` or resource ID. When shared helpers need a
`Workspace`, the job builds one with `systemWorkspace`, marked by
`SYSTEM_TOKEN_IDENTIFIER`. `boundWorkspace` refuses to reuse such a workspace,
so a later `requireWorkspace` inside system work still finds no viewer.
Rosters for system work come from `systemRoster`, read directly from the
component.

```ts
export const SYSTEM_TOKEN_IDENTIFIER = 'system:groam'
systemWorkspace(organizationId) = { organizationId, organizationRole: 'member',
  tokenIdentifier: SYSTEM_TOKEN_IDENTIFIER, userId: SYSTEM_TOKEN_IDENTIFIER, viewerName: 'Groam' }

function boundWorkspace(ctx) {
  candidate = ctx.workspace
  if (!isWorkspace(candidate) || candidate.tokenIdentifier === SYSTEM_TOKEN_IDENTIFIER) return null
  return candidate
}

// modules/travel/issues/resync.ts: purpose-specific, explicit scope
resync.trip({ tripId }):
  data = db.get('trips', tripId); if (!data || data.proposal || data.archive) return null
  workspace = systemWorkspace(data.organizationId)
  syncTripConditions(attachTrip(ctx, data, workspace, roleFor(...)))
```

Source: [workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L137),
[resync.ts](../../../packages/backend/convex/modules/travel/issues/resync.ts#L47).

## Trip visibility, role and mutability guards

Trip builders in `ctx.ts` load the trip through `findVisibleTrip`, which
returns `null` for a trip in another organization, so a valid foreign ID reads
as `'Trip not found'`. `roleFor` gives `organizer` to the trip creator and to
organization managers, and `participant` to everyone else. Visibility does not
imply edit rights: `mutableTripMutation` adds `assertMutable`, and
`assertPlanner` guards planner-only actions such as archive and restore.

```ts
findVisibleTrip(ctx, tripId, workspace) =
  trip && trip.organizationId === workspace.organizationId ? trip : null

roleFor(trip, userId, organizationRole) =
  trip.creator.userId === userId || isOrganizationManager(organizationRole) ? 'organizer' : 'participant'

async function loadTripContext(ctx, tripId, workspace?) {
  ws = workspace ?? await requireWorkspace(ctx)
  trip = await findVisibleTrip(ctx, tripId, ws)
  if (!trip) throw ConvexError('Trip not found')
  return { ...ctx, trip, workspace: ws, role: roleFor(trip, ws.userId, ws.organizationRole) }
}

assertPlanner(ctx): if (ctx.role !== 'organizer') throw ConvexError('You do not have permission to edit this trip')

tripQuery / tripMutation          // args { tripId }, binds workspace, trip, role
mutableTripMutation               // loadMutableTrip = loadTripContext + assertMutable
sharedTripQuery / Mutation        // loadSharedTripContext: re-loads proposal.sourceTripId
destinationMutation               // + destination; 'Trip destination not found' if destination.tripId !== tripId
internal*TripQuery / Mutation     // same, with workspace from requireActor(ctx, asRun)
```

`tripPermissions` derives the UI flags (`canEdit`, `canArchive`, `canPropose`,
`canRestore`, `isReadOnly`) from the same rules. The UI reads those flags, but
the guards enforce them.

Source: [visibility.ts](../../../packages/backend/convex/modules/travel/trips/visibility.ts#L15),
[access.ts](../../../packages/backend/convex/modules/travel/trips/access.ts#L7),
[ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L78).

## Idea working-copy edit rules

The shared trip itinerary is never edited directly. Changes go into an idea:
a working trip that carries `proposal`. `assertMutable` lets only the idea
author edit a working copy, and only while the idea is open. A shared trip
refuses writes even from planners, except inside the local seeder's
`withSeedWrites`. An edit to an idea that is in review clears its approvals
and review, so stale approvals cannot be applied.

```ts
function assertMutable(ctx) {
  if (ctx.trip.archive !== undefined) throw ConvexError('Archived trips are read-only')
  if (ctx.trip.proposal) {
    if (ctx.trip.proposal.author.userId !== ctx.workspace.userId)
      throw ConvexError('Only the idea author can edit this idea trip')
    if (status === 'merged' || status === 'closed') throw ConvexError('Closed ideas are read-only')
    return
  }
  assertPlanner(ctx)
  if (seedWriteDepth > 0) return
  throw ConvexError('Start an idea to change this trip')
}

// patchTrip -> invalidateIdeaReviewAfterEdit (skipped under preserveIdeaReview)
if (status in ['in_review', 'conflicted']):
  delete tripProposalApprovals (take MAX_GROUP_MEMBERS + 1)
  patch tripProposals { groamReview: undefined, updatedAt, conflictWorkingUpdatedAt? }
```

Source: [access.ts](../../../packages/backend/convex/modules/travel/trips/access.ts#L39),
[ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L155).

## Conversation and run access

Each conversation kind declares an `audience` in `conversationKinds`:
`group` uses `members`, `assistant` uses `owner`, `research` uses `trip`.
`DiscussionAccess.forWorkspace` checks the organization, then the audience;
every failure, including a research marked `deletingAt`, looks like
`'Discussion not found'`. `AssistantThreads.require` adds the organization
from the Agent thread summary and the expected scope on top of that. Runs are
visible within their organization, and discussion runs only to discussion
members.

```ts
DiscussionAccess.forWorkspace(ctx, discussionId, workspace):
  d = db.get('discussions', discussionId)
  if (!d || d.organizationId !== workspace.organizationId || d.deletingAt) throw 'Discussion not found'
  switch (kindPolicy(d.kind).audience) {
    case 'owner':   require d.createdBy.userId === workspace.userId
    case 'trip':    require findVisibleTrip(ctx, d.tripId, workspace)
    case 'members': require discussionMembers.by_discussionId_and_userId row
  }

AssistantThreads.require(ctx, threadId, scope):
  workspace = requireWorkspace(ctx)
  summary = parseAssistantThreadSummary(getThreadMetadata(threadId).summary)
  if (summary?.organizationId !== workspace.organizationId) throw 'Assistant conversation not found'
  if (discussion by_threadId) {
    expected = audience === 'owner' ? 'private' : 'discussion'
    if (scope !== expected) throw 'Discussion not found'
    return Discussions.requireThread(ctx, threadId, workspace)
  }
  // legacy personal chats: thread.userId must equal workspace.tokenIdentifier

canViewRun(run, workspace) = run.organizationId === workspace.organizationId &&
  (!run.discussionId || discussionMembers row exists)
requireOrgRun -> 'Agent run not found'
assertCanControl: discussion run, or run creator, or trip organizer,
  else 'Only the trip creator or a group admin can stop this run'
```

Source: [kinds/index.ts](../../../packages/backend/convex/modules/discussions/kinds/index.ts#L17),
[threads/entity.ts](../../../packages/backend/convex/modules/discussions/threads/entity.ts#L72),
[thread/access.ts](../../../packages/backend/convex/modules/assistant/model/thread/access.ts#L15),
[runs/index.ts](../../../packages/backend/convex/modules/assistant/runs/index.ts#L132).

## External AI connection authority

The model provider is resolved from the initiating user's own ChatGPT
connection, never from another member's. `configuredAssistantProvider` first
re-checks organization membership, then loads the user's active connection
through `ownedChatGptConnection`, which rejects connections owned by another
user. Tokens are read only in actions and rechecked on each model fetch. A
`401` or `403` marks the connection for reconnect. Public settings expose
connection metadata (`connected`, `needsReconnect`, `model`), never tokens.

```ts
configuredAssistantProvider(ctx, { organizationId, userId }):
  if (!hasOrganizationMembership(ctx, organizationId, userId)) throw 'Organization access denied'
  connection = usableChatGptConnection(ctx, userId)
  // no tokens or needsReconnect -> 'Connect ChatGPT in Settings → AI to use your ChatGPT plan.'
  // tokens expiring within 60_000 ms -> leased refresh (acquireRefresh / finishRefresh), up to 25 attempts
  model = connection.model ?? models[0]?.slug
  if (!model in models) throw 'Select an available ChatGPT model in Settings → AI.'
  fetch = (req) => {
    current = usableChatGptConnection(ctx, userId, connection._id)   // per step
    res = chatGptFetch(req with Bearer current.tokens.accessToken)
    if (res.status in [401, 403]) storage.markReconnect({ userId, connectionId, revision })
  }
```

Callers pass the credential owner explicitly, for example
`access.credentialOwnerUserId` in assistant sessions and the proposal author in
idea title generation. The tokens are stored in the `chatgptConnections` table,
so a local database export contains them.

Source: [provider.ts](../../../packages/backend/convex/modules/ai/provider.ts#L15),
[chatgpt/actions.ts](../../../packages/backend/convex/modules/ai/chatgpt/actions.ts#L57),
[chatgpt/storage.ts](../../../packages/backend/convex/modules/ai/chatgpt/storage.ts#L17),
[chatgpt/settings.ts](../../../packages/backend/convex/modules/ai/chatgpt/settings.ts#L33).

## Invariants and tests

- Missing sessions, missing active organizations, expired or signed-out
  sessions, sessions of another user and removed members are refused:
  [workspace.test.ts](../../../packages/backend/convex/modules/auth/workspace.test.ts).
- Owner and admin role lists count as organization managers:
  [workspace.test.ts](../../../packages/backend/convex/modules/auth/workspace.test.ts).
- Internal builders act for a running run's creator, refuse finished runs and
  removed creators, prefer a signed-in identity, stay inside the run's group,
  and public functions reject `asRun`:
  [actor.test.ts](../../../packages/backend/convex/modules/auth/actor.test.ts).
- The action-side actor lookup follows the same rules, including legacy runs
  without an actor token:
  [actor-action.test.ts](../../../packages/backend/convex/modules/auth/actor-action.test.ts).
- Tools inside a run pass `asRun` on every Convex call:
  [assistant/tools/index.test.ts](../../../packages/backend/assistant/tools/index.test.ts).
- Creators and managers are organizers; only they can apply ideas; a shared
  trip needs an idea before any change; cross-organization trip access is
  refused: [access.test.ts](../../../packages/backend/convex/modules/travel/trips/access.test.ts),
  [ctx.test.ts](../../../packages/backend/convex/modules/travel/trips/ctx.test.ts).
- Only the idea author edits an idea:
  [versions.test.ts](../../../packages/backend/convex/modules/travel/versions/versions.test.ts).
- Trip-owned resources cannot be edited through another trip:
  [ownership.test.ts](../../../packages/backend/convex/modules/travel/trips/ownership.test.ts).
- Research audiences, group membership, removed researches and private-scope
  separation: [research.test.ts](../../../packages/backend/convex/modules/discussions/research/research.test.ts).
- Private assistant threads refuse other members:
  [model.test.ts](../../../packages/backend/convex/modules/assistant/model/model.test.ts).
- Runs, events and discussion runs stay hidden outside their organization or
  discussion: [runs.test.ts](../../../packages/backend/convex/modules/assistant/runs/runs.test.ts).
- ChatGPT metadata stays private per user, and rejected tokens trigger
  reconnect: [storage.test.ts](../../../packages/backend/convex/modules/ai/chatgpt/storage.test.ts),
  [chatgpt-routes.test.ts](../../../packages/backend/convex/modules/ai/chatgpt/chatgpt-routes.test.ts).

## Extending

- **New guarded public function:** pick the narrowest existing builder
  (`workspaceQuery`, `tripQuery`, `mutableTripMutation`, `destinationMutation`)
  and keep its implicit args. Follow
  [add-convex-route](../../../.agents/skills/add-convex-route/SKILL.md).
- **New builder or guard:** add it next to the resource it protects (for trips,
  `modules/travel/trips/ctx.ts`) by composing an `input` that calls
  `loadTripContext` / `loadMutableTrip`, plus an internal twin that resolves
  the workspace with `requireActor(ctx, asRun)`. See
  [add-backend-module](../../../.agents/skills/add-backend-module/SKILL.md).
- **New agent-callable write:** expose it as an internal actor-aware function
  so the tool's `asRun` validates and trip checks still run.
- **Tests:** cover the allowed path and at least one denial (other
  organization, non-author, finished run) with
  [add-convex-test](../../../.agents/skills/add-convex-test/SKILL.md).
