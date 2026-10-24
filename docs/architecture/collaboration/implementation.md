# Collaboration implementation

This file describes how the Convex backend implements the decisions in
[collaboration](README.md): conversation policy, message receipts, assistant
reply claims, research links, issue condition sync and the derived
notification and activity projections. The pseudocode is simplified from the
source and keeps the real identifiers, limits and error strings; when the two
disagree, the source wins.

## Discussion kinds and policy

Each `discussions` row has a `kind` of `group`, `assistant` or `research`, and
kind-dependent code reads `kindPolicy(kind)` rather than comparing literals.
`DiscussionAccess.forWorkspace` is the single access gate: organization match,
research marked `deletingAt` hidden, then the policy audience. Every failure
throws "Discussion not found", so a denied caller cannot tell hidden from
missing.

```ts
export const conversationKinds = {
  group:     { agentTrigger: 'mention', audience: 'members', home: 'chats',     links: false, trip: 'optional' },
  assistant: { agentTrigger: 'always',  audience: 'owner',   home: 'assistant', links: false, trip: 'none' },
  research:  { agentTrigger: 'mention', audience: 'trip',    home: 'trip',      links: true,  trip: 'required' }
} as const satisfies Record<ConversationKind, KindPolicy>;

// DiscussionAccess.forWorkspace, after the org and deletingAt checks:
switch (kindPolicy(discussion.kind).audience) {
  case 'owner':   require(discussion.createdBy.userId === workspace.userId);
  case 'trip':    require(await findVisibleTrip(ctx, tripId, workspace));     // trip visibility is the boundary
  case 'members': require(discussionMembers row by_discussionId_and_userId);
}
get canManage() { return audience === 'members' || isCreator || (audience === 'trip' && this.tripRole === 'organizer'); }
assertWritable() { if (this.trip?.archive !== undefined) throw new ConvexError('This trip is archived'); }
```

Source: [`kinds/index.ts`](../../../packages/backend/convex/modules/discussions/kinds/index.ts#L17),
[`threads/entity.ts`](../../../packages/backend/convex/modules/discussions/threads/entity.ts#L72).

## Threads, messages and receipts

The Agent component stores the thread, message parts and stream state. The
application table `discussionMessages` stores one receipt per user message:
`clientRequestId`, `author`, displayed `content`, `mediaIds`,
`editedAt`/`deletedAt` and the assistant fields. `Discussions.send` is
idempotent on `(discussionId, author.userId, clientRequestId)`, rate limited
(`discussionMessage`: capacity 12, 60 per minute) and saves the Agent message
before inserting the receipt. `listMessages` merges Agent UI messages with
receipts into one authorized page. Display and model history are separate:
`editMessage` patches only the receipt, while `deleteMessage` blanks the
receipt and scrubs the Agent message so later turns never see the original.

```ts
static async send(ctx, { discussionId, text, clientRequestId, requestedAssistantAgent, mediaIds = [] }) {
  const access = await DiscussionAccess.require(ctx, discussionId); access.assertWritable();
  const content = Messages.normalizeContent(text, 'Message', { allowEmpty: media.length > 0 });   // at most 5_000
  const requestId = Messages.normalizeRequestId(clientRequestId, 'Message');                       // 8..100 chars
  const assistantAgent = selectAssistantAgent(discussion.kind, content.text, requestedAssistantAgent);
  if (existing receipt for requestId) { if (differs) throw new ConvexError('Message request id was already used'); return it; }
  await discussionRateLimiter.limit(ctx, 'discussionMessage', { key: workspace.tokenIdentifier, throws: true });
  const { messageId } = await saveMessage(ctx, components.agent, { prompt: agentPrompt, threadId, userId });
  insert discussionMessages { agentMessageId: messageId, ...(assistantAgent ? { assistantAgent, assistantStatus: 'requested' } : {}) };
  patch discussion { lastMessage: { authorName, text: text.slice(0, 160) }, updatedAt }; await access.markSeen(ctx, sentAt);
  if (assistantAgent) await AgentRuns.queueDiscussionTurn(ctx, { agentId: assistantAgent, discussionId, threadId });
  return { assistantAgent, messageId };
}
// listMessages: text = receipt?.deletedAt ? 'This message was deleted' : displayUserMessageText(...)
```

Group chats take 2 to `MAX_DISCUSSION_MEMBERS` (25) roster members, each with
a `discussionMembers` row, and a member may be in at most
`MAX_DISCUSSIONS_PER_USER` (100) group chats. For the `trip` audience,
`markSeen` inserts a participation row on first touch and increments the
research `participantCount`; the row records engagement, not access.

Source: [`threads/index.ts`](../../../packages/backend/convex/modules/discussions/threads/index.ts#L480),
[`threads/schema.ts`](../../../packages/backend/convex/modules/discussions/threads/schema.ts#L93),
[`threads/limits.ts`](../../../packages/backend/convex/modules/discussions/threads/limits.ts),
[`messages/index.ts`](../../../packages/backend/convex/modules/discussions/messages/index.ts).

## Reply coordination and response claims

`agentTrigger: 'always'` kinds answer with the requested or default agent;
`mention` kinds need a request or an @mention. A requesting message gets
`assistantStatus: 'requested'` and a queued run. The sender then calls the
`respond` action with the message id and its screen snapshot. The internal
mutation claims the receipt by flipping it to `responding`; any other caller
gets `null` and does nothing, unless the claim is older than
`ASSISTANT_CLAIM_STALE_MS` (10 minutes). The AI rate limit runs after the
claim, so a refusal finishes the request as `failed` instead of leaving it
queued.

```ts
static async claimAssistantResponse(ctx, discussionId, promptMessageId, screen) {
  if (!request || request.author.userId !== workspace.userId || !request.assistantAgent) throw new ConvexError('AI request not found');
  if (status === 'complete' || (status === 'responding' && !isStaleClaim(assistantClaimedAt, Date.now()))) return null;
  patch receipt { assistantStatus: 'responding', assistantClaimedAt: Date.now(), assistantError: undefined };
  const runId = await AgentRuns.claimDiscussionTurn(ctx, { promptMessageId, screen, discussionUpdatedAt });
  return { agent, expectedUpdatedAt: discussion.updatedAt, prompt, runId, threadId };
}
// DiscussionAssistant.respond
const claim = await Discussions.claimAssistantResponse(...); if (!claim) return null;
try { await aiRateLimiter.limit(ctx, 'tripAssistantMessage', { key: workspace.tokenIdentifier, throws: true }); }
catch (error) { await Discussions.finishAssistantResponse(ctx, { responseText: null, error: AssistantErrors.message(error) }); return null; }
return await AgentEngine.start(ctx, claim.runId);
```

`claimDiscussionTurn` promotes the oldest queued run for the discussion (or
inserts a running one) and aborts other running runs for the same prompt, so
a stale re-claim supersedes a crashed attempt. `finishAssistantResponse`
marks the receipt `complete` or `failed` (a blank reply fails with "Groam
returned an empty reply") and updates `lastMessage` only while the
discussion's `updatedAt` still equals `expectedUpdatedAt`.

Runs live in `agentRuns`, not in the thread, so a conversation continues while
a run waits. When a turn ends on an active wait, the engine's `suspend`
answers the chat request with `finishRun: false` and moves the run to
`waiting`; the resumed reply is recorded by `recordAssistantReply`. Stop
aborts the active run (`abortActiveForDiscussion`), and purge aborts every
queued, running or waiting one (`abortAllForDiscussion`).

```ts
// assistant/engine/functions.ts suspend
await Discussions.finishAssistantResponse(ctx, { finishRun: false,
  responseText: run.report?.trim() || `Waiting for ${label}.`, expectedUpdatedAt: run.discussionUpdatedAt ?? 0 });
patch run { status: 'waiting', headline: `Waiting for ${label}`, promptMessageId: undefined };
```

Source: [`threads/index.ts`](../../../packages/backend/convex/modules/discussions/threads/index.ts#L627),
[`assistant/respond.ts`](../../../packages/backend/convex/modules/discussions/assistant/respond.ts),
[`routes/.../respond.ts`](../../../packages/backend/convex/routes/discussions/messages/respond.ts),
[`runs/index.ts`](../../../packages/backend/convex/modules/assistant/runs/index.ts#L280),
[`engine/functions.ts`](../../../packages/backend/convex/modules/assistant/engine/functions.ts#L62).
Run lifecycle: [agent execution](../agent-execution/README.md).

## Typed resource links and cleanup

`discussionLinks` rows point from a research to an issue, an idea
(`tripProposals`) or a destination, activity or stay. Only kinds with
`links: true` may link. `link` checks the target belongs to the research's
trip, dedupes on `targetKey`, caps at `MAX_LINKS_PER_RESEARCH` (50) and keeps
the denormalized `linkCount`. Forward reads resolve labels and drop links
whose target vanished; reverse reads by `targetKey` keep only researches the
caller can open.

```ts
linkTargetKey(t) = t.kind === 'issue' ? `issue:${t.issueId}` : t.kind === 'idea' ? `idea:${t.proposalId}` : `${t.target.type}:${t.target.id}`;
static async link(ctx, discussionId, target) {
  const tripId = linkableTripId(access);            // 'This conversation cannot be linked'
  access.assertWritable();
  await assertTargetInTrip(ctx, tripId, target);    // 'Issue not found in this trip' | 'Idea not found in this trip'
  if (existing by_discussionId_and_targetKey) return existing._id;
  if (research.linkCount >= MAX_LINKS_PER_RESEARCH) throw new ConvexError(`A research can have up to ${MAX_LINKS_PER_RESEARCH} links`);
  patch linkCount + 1; insert discussionLinks { target, targetKey, tripId, createdBy };
}
static async listForTarget(ctx, workspace, target) {      // routes/discussions/research/links/target
  rows by_targetKey .take(MAX_RESEARCHES_PER_TRIP); keep those DiscussionAccess.forWorkspace allows;
}
```

`removeLinksForTargetKey` runs from destination, activity and stay deletion,
from items removed when an idea is applied (`travel/versions/apply.ts`), and
from the issue and proposal batches of trip deletion (there is no
single-issue delete route); trip deletion then sweeps `removeLinksForTrip`.

Source: [`links/index.ts`](../../../packages/backend/convex/modules/discussions/links/index.ts#L80),
[`links/cascade.ts`](../../../packages/backend/convex/modules/discussions/links/cascade.ts#L18),
[`links/schema.ts`](../../../packages/backend/convex/modules/discussions/links/schema.ts#L52).

## Research lifecycle and deletion

A research is a `discussions` row with `kind: 'research'`, a required
`tripId`, a title of at most 120 characters, an optional `brief` of at most
2000, and denormalized `linkCount` and `participantCount`. Creation is
idempotent on `clientRequestId`, refused on archived trips, capped at
`MAX_RESEARCHES_PER_TRIP` (100), and creates its own Agent thread. Removal
sets `deletingAt` first, which makes the row unreachable, then purges
dependents in bounded batches: a few steps inline, the rest in a
self-rescheduling internal mutation.

```ts
static async remove(ctx, discussionId) {
  access.assertCanManage(); access.assertWritable();     // 'Only the creator or a trip organizer can do this'
  await ctx.db.patch('discussions', research._id, { deletingAt: Date.now() });
  for (let step = 0; more && step < INLINE_PURGE_STEPS; step += 1) more = await Discussions.purge(ctx, research, PURGE_BATCH_SIZE); // 6, 50
  if (more) await ctx.scheduler.runAfter(0, internal.modules.discussions.threads.cleanup.purgeDiscussion, { discussionId });
}
static async purge(ctx, discussion, batchSize) {          // true while work remains
  await AgentRuns.abortAllForDiscussion(ctx, discussion._id);
  if (await PollCleanup.purgeForDiscussion(ctx, discussion._id, batchSize)) return true;
  // one batch each: discussionMessages (+ media refs), discussionMessageReactions, discussionMembers,
  // discussionLinks; then the Agent thread and the row
}
```

Source: [`research/index.ts`](../../../packages/backend/convex/modules/discussions/research/index.ts#L171),
[`threads/index.ts`](../../../packages/backend/convex/modules/discussions/threads/index.ts#L809),
[`threads/cleanup.ts`](../../../packages/backend/convex/modules/discussions/threads/cleanup.ts).

## Issues and condition sync

An issue's "done when" is a row in `tripIssueConditions`: `manual` text or a
checked `rule` (starter or composed). `syncTripConditions` reconciles checked
issues with the shared trip's facts. It returns at once for proposal working
copies, closes active issues whose condition holds, reopens `closed` ones
whose condition fails, and leaves `wont_do` alone. Moved issues get a system comment and signal waits on the issue.
Manual status moves that disagree with a checked condition are refused in
`lifecycle.ts`.

```ts
export function affectsConditions(patch) { return ['budget', 'destination', 'duration', 'startDate'].some((f) => f in patch); }
function reconciledStatus(status, met) {
  if (met && !isResolved(status)) return 'closed';
  if (!met && status === 'closed') return 'open';
  return null;
}
export async function syncTripConditions(ctx: MutableTripCtx) {
  if (ctx.trip.proposal) return;
  if (![...(await tripConditions(ctx, ctx.trip._id)).values()].some(isCheckedCondition)) return;
  const facts = await loadConditionFacts(ctx, issues);
  for each move: patch { status, closedAt, updatedAt };
    appendSystemComment(... { change: 'resolved' | 'reopened', kind: 'auto', label });
    AgentWaits.signal(ctx, { kind: 'issue', refId: issue._id });
}
```

Callers: `patchTrip` when `affectsConditions(value)` (an idea merge always
patches `destination`), stay writes, RSVP writes, issue create and edit with a
rule, and `resync.trip`, which `resync.organization` schedules 25 trips at a
time after roster changes.

Source: [`issues/sync.ts`](../../../packages/backend/convex/modules/travel/issues/sync.ts#L40),
[`issues/condition.ts`](../../../packages/backend/convex/modules/travel/issues/condition.ts),
[`issues/lifecycle.ts`](../../../packages/backend/convex/modules/travel/issues/lifecycle.ts),
[`issues/resync.ts`](../../../packages/backend/convex/modules/travel/issues/resync.ts),
[`trips/ctx.ts`](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L181),
[`travelers/index.ts`](../../../packages/backend/convex/modules/travel/travelers/index.ts#L93).

## Issues and proposals

A proposal may carry `issueId` when an idea starts from an issue. Review and
apply stay in the versions module. After a merge, `closeAfterMerge` closes the
linked issue only if it is unresolved and has no checked condition; a checked
condition is left to `syncTripConditions` over the merged facts.

```ts
if (proposal.issueId) await TripIssues.closeAfterMerge(ctx, issue, { actor, ideaTitle: proposal.title, timestamp });
export async function closeAfterMerge(ctx, issue, merge) {
  if (isResolved(issue.status) || isCheckedCondition(await conditionOf(ctx, issue._id))) return;
  patch { status: 'closed', closedAt, updatedAt };
  appendSystemComment(... { idea: ideaTitle, kind: 'closed_by_idea' });     // "closed this by applying <idea>"
  await AgentWaits.signal(ctx, { kind: 'issue', refId: issue._id });
}
```

Source: [`issues/lifecycle.ts`](../../../packages/backend/convex/modules/travel/issues/lifecycle.ts#L111),
[`versions/index.ts`](../../../packages/backend/convex/modules/travel/versions/index.ts#L1382).
Review and apply: [change lifecycle](../change-lifecycle/README.md).

## Polls in conversations

A poll may belong to a discussion and a shared trip. Creation checks
`DiscussionAccess` and that the poll trip matches the chat trip ("The poll
trip must match the chat trip"; "Polls belong to the shared trip, not an
idea"). Votes, retractions and closes call `AgentWaits.signal` with kind
`poll`; RSVP and roster changes schedule `PollSignals`, which re-check open
polls 20 at a time. Discussion purge removes a chat's polls first.

Source: [`polls/writes.ts`](../../../packages/backend/convex/modules/polls/writes.ts),
[`polls/signals.ts`](../../../packages/backend/convex/modules/polls/signals.ts).

## Derived projections: notifications and recent activity

Notifications are per-user `workspaceNotifications` rows written by the
originating domain; the only producer today is the versions module
(`notifyIdeaAudience` for `idea_shared`, `idea_applied`, `idea_passed`, and
`requestReview` for `idea_review_requested`, sent when an edit to a live idea
assigns a member work, such as bringing a packing item). Reads
return the newest 50, and read state is a `readAt` stamp. Recent activity is
`tripAuditEvents`: `recordActivity` inserts an event and deletes the oldest
beyond `MAX_ACTIVITY_ITEMS` (30), and trip deletion removes the rest, so it is
a bounded presentation history rather than a ledger.

```ts
export async function notify(ctx, { body, href, kind, organizationId, title, userIds }) {
  for (const userId of [...new Set(userIds)].slice(0, MAX_RECIPIENTS))      // 100
    await ctx.db.insert('workspaceNotifications', { body, href, kind, organizationId, title, userId });
}
export async function recordActivity(ctx: MutableTripCtx, type, message) {
  await ctx.db.insert('tripAuditEvents', { actor, message, tripId: ctx.trip._id, type });
  const recent = tripAuditEvents by_tripId desc .take(MAX_ACTIVITY_ITEMS + 1);
  if (recent[MAX_ACTIVITY_ITEMS]) await ctx.db.delete('tripAuditEvents', recent[MAX_ACTIVITY_ITEMS]._id);
}
```

Source: [`notifications/index.ts`](../../../packages/backend/convex/modules/notifications/index.ts#L12),
[`versions/index.ts`](../../../packages/backend/convex/modules/travel/versions/index.ts#L248),
[`trips/ctx.ts`](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L199).

## Invariants and tests

- Group chats need membership, research follows trip visibility, other
  organizations get "not found", and a research is not reachable through the
  private assistant scope:
  [`threads.test.ts`](../../../packages/backend/convex/modules/discussions/threads/threads.test.ts),
  [`research.test.ts`](../../../packages/backend/convex/modules/discussions/research/research.test.ts).
- Only the creator or a trip organizer manages a research; archived trips
  refuse writes but allow reads:
  [`research.test.ts`](../../../packages/backend/convex/modules/discussions/research/research.test.ts).
- Message and request-id limits:
  [`messages.test.ts`](../../../packages/backend/convex/modules/discussions/messages/messages.test.ts);
  a deleted message loses text, parts and attachments for everyone:
  [`threads.test.ts`](../../../packages/backend/convex/modules/discussions/threads/threads.test.ts).
- A second `respond` is a no-op, a stale claim can be reclaimed, and a
  rate-limited request does not stay queued:
  [`respond.test.ts`](../../../packages/backend/convex/modules/discussions/assistant/respond.test.ts),
  [`threads.test.ts`](../../../packages/backend/convex/modules/discussions/threads/threads.test.ts).
- A waiting chat turn answers its request, and deleting a chat stops its
  waiting run:
  [`resume.test.ts`](../../../packages/backend/convex/modules/assistant/engine/resume.test.ts).
- Links validate the trip, dedupe, reverse-lookup, are capped and vanish with
  their target; a research being removed is inaccessible:
  [`research.test.ts`](../../../packages/backend/convex/modules/discussions/research/research.test.ts).
- Condition sync re-checks the right patches, skips working copies, follows
  merged ideas both ways and refuses manual moves against a rule:
  [`sync.test.ts`](../../../packages/backend/convex/modules/travel/issues/sync.test.ts),
  [`issue-conditions.test.ts`](../../../packages/backend/convex/modules/travel/issues/issue-conditions.test.ts),
  journey [`resolve-an-issue-by-its-rule.test.tsx`](../../../apps/web/e2e/issues/resolve-an-issue-by-its-rule.test.tsx).
- A merge closes its linked manual issue once and leaves `wont_do` alone:
  [`close-after-merge.test.ts`](../../../packages/backend/convex/modules/travel/issues/close-after-merge.test.ts),
  journey [`resolve-an-issue-with-a-merged-idea.test.tsx`](../../../apps/web/e2e/issues/resolve-an-issue-with-a-merged-idea.test.tsx).
- Sharing an idea notifies the reviewer, who can mark it read:
  [`notifications.test.ts`](../../../packages/backend/convex/modules/notifications/notifications.test.ts).

## Extending

- New conversation kind: extend `ConversationKind`, `conversationKinds` and
  the `discussions` union, and route each decision through `kindPolicy`
  ([add-backend-module](../../../.agents/skills/add-backend-module/SKILL.md)).
- New link target: extend `linkTarget`, `linkTargetKey`, `assertTargetInTrip`
  and `resolveLabel`, and call `removeLinksForTargetKey` on its delete path.
- New rule fact: make every shared-trip write that changes it reach
  `syncTripConditions`, through a field in `affectsConditions` or a direct
  call.
- New notification kind: add it to `NotificationValidators.kind` and write it
  from the originating domain with `Notifications.notify`.
- Public entry points:
  [add-convex-route](../../../.agents/skills/add-convex-route/SKILL.md); tests
  through real routes:
  [add-convex-test](../../../.agents/skills/add-convex-test/SKILL.md).
