# Change lifecycle implementation

This file describes how ideas move from a working copy to the shared plan in
the Convex backend: creation, edit rules, review, the prepared Git operations,
merge, rebase and reconciliation. It implements the decisions in
[README.md](./README.md). The pseudocode is simplified from the source; when
they disagree, the source wins.

## Proposal model and statuses

An idea is a `tripProposals` row plus a working `trips` row whose `proposal`
field mirrors the status. The base snapshot lives in `tripProposalSnapshots`,
kept out of list-facing metadata. Approvals, feedback and the single in-flight
Git operation per proposal have their own tables.

```ts
status = 'draft' | 'in_review' | 'conflicted' | 'merged' | 'closed';
tripProposals { author, baseCommit?, tipCommit?, mergeCommit?, baseUpdatedAt, conflictPaths?,
  conflictSourceUpdatedAt?, conflictWorkingUpdatedAt?, groamReview?, issueId?, requiredApprovals,
  reviewers, sourceTripId, status, unresolvedFeedbackCount, updatedAt, workingTripId, ... }
tripProposalOperations = { kind: 'submit', expectedWorkingUpdatedAt, token, requestedBy, ... }
  | { kind: 'merge' | 'rebase', expectedProposalUpdatedAt, expectedSourceUpdatedAt, expectedWorkingUpdatedAt, token, ... }
```

Source: [versions/schema.ts](../../../packages/backend/convex/modules/travel/versions/schema.ts).

## Creating an idea

`TripVersions.create` runs in the `create` route's `tripMutation`. It refuses
archived trips and working copies, captures the organization's current
`requiredApprovals`, stores a base snapshot of the shared trip, inserts the
working trip, and copies itinerary rows with `sourceId` pointing back at the
source rows. Media and cover storage are shared, not copied. Starting from an
issue reuses the author's open idea for that issue when there is one.

```ts
async function create(ctx, sourceTripId, options?) {
  await assertSharedTripIdeaSource(ctx, source); // 'Archived trips are read-only' / 'Start ideas from the shared trip'
  if (options?.issueId) { const adopted = await adoptOpenProposalForIssue(...); if (adopted) return adopted; }
  if (proposals.length >= MAX_PROPOSALS /* 50 */) throw new ConvexError(`Trips support up to ${MAX_PROPOSALS} ideas`);
  const settings = await ReviewSettings.forOrganization(ctx, organizationId); // default 1
  const baseSnapshot = await VersionSnapshots.create(ctx, source.trip);
  const workingTripId = await insertWithShortId(ctx, 'trips', proposalTripData(source, now, ideaName));
  await cloneTripContent(ctx, source, workingTripId);
  const proposalId = await insertWithShortId(ctx, 'tripProposals', { status: 'draft',
    reviewers: [ideaReviewer()], requiredApprovals: settings.requiredApprovals, ... });
  await ctx.db.insert('tripProposalSnapshots', { proposalId, value: JSON.stringify(baseSnapshot) });
}
```

Source: [versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L401),
[versions/clone.ts](../../../packages/backend/convex/modules/travel/versions/clone.ts#L46).

## Edit rules and review invalidation

Planning writes on a working copy pass `assertMutable` (author only; `merged`
or `closed` is read-only) and then `patchTrip`. For an `in_review` or
`conflicted` idea, `patchTrip` deletes every approval, clears `groamReview` and
bumps the proposal's `updatedAt`, which also invalidates a prepared merge.
Rebase writes are wrapped in `preserveIdeaReview` and skip this step.

```ts
async function invalidateIdeaReviewAfterEdit(ctx) {
  if (ctx[PRESERVE_IDEA_REVIEW]) return;
  if (status !== 'in_review' && status !== 'conflicted') return;
  delete every tripProposalApprovals row by_proposalId;
  patch tripProposals { groamReview: undefined, updatedAt: ctx.trip.updatedAt,
    ...(status === 'conflicted' ? { conflictWorkingUpdatedAt: ctx.trip.updatedAt } : {}) };
}
```

Source: [trips/ctx.ts](../../../packages/backend/convex/modules/travel/trips/ctx.ts#L155),
[trips/access.ts](../../../packages/backend/convex/modules/travel/trips/access.ts#L39).

## Prepared operations outside the transaction

Git history is computed in a `'use node'` action, outside any transaction. Each
route that needs it has the same shape: a `prepare*` internal mutation checks
state, stores an operation row with a fresh token and the `updatedAt` values
it saw, and returns the history input; the action runs `createHistory`; a
`finish*` mutation re-checks token, caller and every expected timestamp before
writing. Failures call `cancelOperation`, which deletes the row only if the
token still matches. A newer prepare replaces the row and `close` deletes it,
so an earlier readiness check never authorizes a later finish.

```ts
const prepared = await ctx.runMutation(workflow.prepareSubmit, { proposalId });
try {
  const history = await ctx.runAction(git.action.createHistory, prepared.history);
  if (!history.tipCommit) throw new Error('Unable to share change history for this idea');
  await ctx.runMutation(workflow.finishSubmit, { ..., token: prepared.token });
} catch (error) {
  await ctx.runMutation(workflow.cancelOperation, { proposalId, token: prepared.token });
  IdeaErrors.rethrow(error); // Git-internal text => 'Unable to process change history for this idea'
}
beginOperation: token = crypto.randomUUID(); replace or insert tripProposalOperations by_proposalId
```

Source: [versions/workflow.ts](../../../packages/backend/convex/modules/travel/versions/workflow.ts),
[routes/trips/versions/submit.ts](../../../packages/backend/convex/routes/trips/versions/submit.ts),
[versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L171).

## Submit

Only the author can submit a draft, and only when the working snapshot differs
from the base. `finishSubmit` moves both rows to `in_review`, stores the commit
ids, notifies the group and queues the Idea reviewer run as the author.

```ts
prepareSubmit: 'Only draft ideas can be submitted' / 'Only the idea author can submit it for review'
  VersionSnapshots.match(base, proposed) => 'Make at least one change before requesting review'
finishSubmit: wrong kind, token or caller, working.updatedAt moved, not draft
  => 'This idea can no longer be shared'
  patch { baseCommit, tipCommit, status: 'in_review', submittedAt }; notify 'idea_shared'
  queueIdeaReviewerRun(ctx, proposal, source.workspace.tokenIdentifier)
```

Source: [versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L1080).

## Feedback, approval and quorum

Feedback is accepted on open ideas; top-level `change_request` comments raise
`unresolvedFeedbackCount`, and only the author or an organizer resolves them.
When human reviewers were requested the author cannot approve; otherwise the
author may self-approve. The agent's approval counts while an agent reviewer
is assigned. `assertMergeReady` runs in both prepare and finish.

```ts
MAX_PROPOSAL_FEEDBACK = 200; MAX_PROPOSAL_FEEDBACK_LENGTH = 2_000; // ReviewSettings.set: 1..10, managers only
eligibleReviewers = requiresIndependentReview(proposal) ? voters.filter((v) => v.userId !== author) : voters;
countedApprovals = approvals.filter((a) => a.approver.kind === 'agent' ? agentAssigned : eligibleIds.has(a.approver.userId));
async function assertMergeReady(ctx, proposalId) {
  assertCanMerge(source); // 'Only the trip creator or a group admin can apply ideas'
  if (status !== 'in_review' && status !== 'conflicted') throw 'Only ideas in review can be applied';
  if (!(baseCommit && tipCommit)) throw 'This idea is missing its change history';
  if (unresolvedFeedbackCount > 0) throw 'Resolve all idea feedback before applying';
  if (approvalCount < requiredApprovals)
    throw `This proposal needs ${quorum} approval${quorum === 1 ? '' : 's'} before it can be applied`;
}
```

Source: [versions/quorum.ts](../../../packages/backend/convex/modules/travel/versions/quorum.ts),
[versions/settings.ts](../../../packages/backend/convex/modules/travel/versions/settings.ts),
[versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L1233).

## Agent review freshness

The reviewer reads `reviewContext`, which includes `expectedReviewRevision`, a
SHA-256 of the title, base files and working files. `finishAgentReview`
recomputes it and checks the run in the same transaction as the verdict.
Edits, rebases (new base) and automatic cover updates change the revision;
feedback, reviewer changes and shared-plan changes do not. An `approve` with
blocking comments is downgraded to `request_changes`.

```ts
revision = sha256(JSON.stringify([proposal.title, base.files, proposed.files]));
requireCurrentAgentReview:
  no agent reviewer => 'Idea reviewer is not assigned to review this idea'
  not in_review/conflicted => 'The idea reviewer can only review an open idea'
  run?.status !== 'running' || run.agentId !== 'reviewer' || run.proposalId !== proposalId
    => 'Idea review is no longer active'
  revision !== review.expectedReviewRevision => 'This idea changed during review. Request a new review.'
finishAgentReview: <= MAX_AGENT_REVIEW_COMMENTS (6); insert summary and comments;
  syncAgentApproval(ctx, proposal, verdict === 'approve' && status === 'in_review');
  patch { groamReview: { status: changesRequested ? 'changes_requested' : 'passed', ... } }
```

Source: [versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L780),
[agent/review/index.ts](../../../packages/backend/convex/modules/travel/versions/agent/review/index.ts),
[standalone/session.ts](../../../packages/backend/convex/modules/assistant/standalone/session.ts).

## Typed snapshots and the Git engine

Snapshots are sorted JSON files keyed by stable source keys (see the
[domain model implementation](../domain-model/implementation.md#what-is-and-is-not-versioned)).
Each field's `VersionDiff` strategy (`hidden`, `media`, or a format such as
`money`) drives presentation only. `TripGit` builds an in-memory isomorphic-git
repository on memfs per call: base, tip on base, current on base (or base when
equal), then a non-fast-forward merge. Conflicts, and merged files that are no
longer valid JSON, become a `trip_merge_conflict` error carrying paths.
`VersionMerge.conflicts` is the file-level three-way check used by rebase.

```ts
MAX_GIT_FILES = 525; MAX_GIT_SNAPSHOT_BYTES = 800 * 1024; // bad path => 'Trip version contains an invalid Git path'
git.merge({ ours: 'main', theirs: 'proposal', fastForward: false, abortOnConflict: true })
  MergeConflictError => ConvexError({ code: 'trip_merge_conflict', message: `Unable to automatically combine ${paths}`, paths })
merge.resolution => commit it with parents [currentCommit, tipCommit]
detectConflictPaths = paths where current !== base && proposed !== base && current !== proposed
```

Source: [git/index.ts](../../../packages/backend/convex/modules/travel/versions/git/index.ts),
[resolution.ts](../../../packages/backend/convex/modules/travel/versions/resolution.ts),
[snapshot/format.ts](../../../packages/backend/convex/modules/travel/versions/snapshot/format.ts),
[fields/index.ts](../../../packages/backend/convex/modules/travel/versions/fields/index.ts).

## Merge, conflicts and resolution

`runApprovedMerge` serves the public merge route and the agent's
`merge.action.apply`. `prepareMerge` requires `in_review` and captures three
snapshots and three `updatedAt` values. On `trip_merge_conflict` the action
calls `markConflict`, which records sorted paths and the shared trip's
`updatedAt` and sets `conflicted`. The resolve route then sends one choice per
path; `prepareResolution` refuses if either trip changed since.

```ts
finishMerge: wrong kind, token or caller, or any expected*UpdatedAt moved
  => 'This idea can no longer be applied'
  VersionApply.snapshot(ctx, source, mergedSnapshot); patch { status: 'merged', mergeCommit, mergedAt }
  if (proposal.issueId) TripIssues.closeAfterMerge(...); recordActivity('proposed_version_merged'); notify 'idea_applied'
markConflict: 0 or > 525 paths => 'Change history returned an invalid conflict list'
prepareResolution: 'This idea has no conflicts to resolve' / 'The trip changed again. Recheck conflicts before applying'
VersionMerge.resolve: one 'current' | 'proposed' choice per conflict path => else 'Choose a resolution for every conflict'
```

Source: [merge/action.ts](../../../packages/backend/convex/modules/travel/versions/merge/action.ts),
[versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L1263),
[issues/lifecycle.ts](../../../packages/backend/convex/modules/travel/issues/lifecycle.ts#L111).

## Rebase

Rebase replays an `in_review` or `conflicted` idea onto the latest shared
plan, for the author or an organizer. Missing choices return `needs_choices`;
an unchanged shared trip is a `noop`. Optional `details` apply per-field `mine`
choices to `trip.json`. `finishRebase` writes the result into the working copy
with `retainSourceKeys: true`, stores the current shared snapshot as the new
base, and returns the idea to `in_review`. Existing approvals are kept.

```ts
prepareRebase: 'Only the idea author or a group admin can rebase' / 'Only ideas in review can be rebased'
  stale details => 'The trip changed while you were reviewing. Review the latest diff and try again.'
  conflictPaths = VersionMerge.conflicts(base, current, proposed)
  missing choice => { kind: 'needs_choices' }; nothing changed => { kind: 'noop' }
  rebasedSnapshot = VersionMerge.resolve(...); beginOperation({ kind: 'rebase', ... })
finishRebase: token or timestamps moved => 'This idea can no longer be rebased'
  VersionApply.snapshot(ctx, preserveIdeaReview(working), rebasedSnapshot, { retainSourceKeys: true })
  tripProposalSnapshots.value = JSON.stringify(baseSnapshot); patch { baseUpdatedAt, status: 'in_review' }
```

Source: [versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L1529),
[detailrebase.ts](../../../packages/backend/convex/modules/travel/versions/detailrebase.ts).

## Reconciliation on apply

`VersionApply.snapshot` matches existing rows by `sourceId ?? _id`, inserts or
patches only changed rows, maps `*Key` references to new ids, and deletes rows
no longer present together with their pins, discussion links and geospatial
entries. Missing or cross-destination transfer endpoints abort the mutation.
The trip row is patched last through `patchTrip`; `destination` is always in
that patch, so issue conditions over the itinerary are re-checked.

```ts
const snapshot = VersionSnapshots.parse(mergedSnapshot);
await applyPackingSnapshot(...);
destinations = await reconcileDestinations(...);          // TripLocations.setDestination
await Promise.all([reconcileActivities, reconcileStays]); // 'Applying this idea produced an invalid activity destination'
await Promise.all([reconcileActivityTransfers, reconcileBoundaryTransfers, reconcileDestinationTransfers]);
  // 'Applying this idea produced an invalid activity route' / '... invalid destination route'
removeMissingTransfers; delete missing activities, stays, destinations (DestinationCover.deleteStorage)
setAttachments(trip); patchTrip(source, { ...tripDetails, updatedAt: Math.max(Date.now(), updatedAt + 1) })
TripLocations.setTrip(...); DestinationCover.ensureForTrip(ctx, source.trip._id)
```

Source: [versions/apply.ts](../../../packages/backend/convex/modules/travel/versions/apply.ts#L396),
[packing/apply.ts](../../../packages/backend/convex/modules/travel/packing/apply.ts),
[issues/sync.ts](../../../packages/backend/convex/modules/travel/issues/sync.ts#L17).

## Close

The author or an organizer can close an open idea; a submitted one needs a
note. Closing deletes any in-flight operation, so a pending submit, merge or
rebase cannot finish, and a running review fails its status check.

```ts
close: not open => return null; not author or organizer => 'Only the author or an organizer can close this idea'
  submitted and no reason => 'Add a short note about why this idea is being passed on'
  reason.length > 280 => 'Pass-on notes must be 280 characters or fewer'
  delete operation row; patch both rows { status: 'closed' }; notify 'idea_passed'
```

Source: [versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L1709).

## Authority per operation

Agent steps pass `asRun`, and `requireActor` binds the run creator's workspace,
so an agent acts with that user's authority and the same readiness checks.

| Operation | Who | Check |
| --- | --- | --- |
| Create | Member who can see an unarchived shared trip | `assertSharedTripIdeaSource` |
| Edit working copy | Author, idea open | `assertMutable` |
| Submit | Author, `draft` | `prepareSubmit`, `finishSubmit` |
| Reviewers, resolve feedback | Author or organizer | `canManageReviewers`, `resolveFeedback` |
| Approve | Eligible voter | `setApproval`, `eligibleReviewers` |
| Rebase | Author or organizer | `assertCanRebase` |
| Apply or resolve | Trip creator or organization manager | `assertCanMerge` |
| Close | Author or organizer | `close` |
| Required approvals | Organization manager | `ReviewSettings.set` |

Source: [versions/index.ts](../../../packages/backend/convex/modules/travel/versions/index.ts#L126),
[auth/workspace.ts](../../../packages/backend/convex/modules/auth/workspace.ts#L279).

## Invariants and tests

- Ideas start only from shared trips, only the author edits, quorum and the
  apply role hold, racing edits and close invalidate prepared operations, and
  forged finish calls fail:
  [versions.test.ts](../../../packages/backend/convex/modules/travel/versions/versions.test.ts).
- Edits after submit, including packing edits, clear approvals:
  [access.test.ts](../../../packages/backend/convex/modules/travel/trips/access.test.ts),
  [packing-versions.test.ts](../../../packages/backend/convex/modules/travel/packing/packing-versions.test.ts).
- A stale, stopped, closed or rebased review cannot commit:
  [review-freshness.test.ts](../../../packages/backend/convex/modules/travel/versions/agent/review/review-freshness.test.ts).
- Compatible changes combine and real conflicts are reported:
  [git.test.ts](../../../packages/backend/convex/modules/travel/versions/git/git.test.ts),
  [resolution.test.ts](../../../packages/backend/convex/modules/travel/versions/resolution.test.ts).
- Rebase keeps gates and row ids and rejects stale choices:
  [rebase.test.ts](../../../packages/backend/convex/modules/travel/versions/rebase.test.ts),
  [detailresolution.test.ts](../../../packages/backend/convex/modules/travel/versions/detailresolution.test.ts).
- Snapshots reject unknown, duplicate and oversized files:
  [snapshot.test.ts](../../../packages/backend/convex/modules/travel/versions/snapshot/snapshot.test.ts).
- A merge closes its linked issue unless a checked condition decides:
  [close-after-merge.test.ts](../../../packages/backend/convex/modules/travel/issues/close-after-merge.test.ts).

## Extending

To version a new field, add it with a `VersionDiff` strategy and label to the
owning model (for example `TripVersionModel`), then update
`VersionSnapshots.create`, `snapshot/format.ts`, `clone.ts` and `apply.ts`.
Follow [add-backend-module](../../../.agents/skills/add-backend-module/SKILL.md)
and test through the real `api.routes.trips.versions.*` routes with
[add-convex-test](../../../.agents/skills/add-convex-test/SKILL.md). A new
operation that needs Git history must use the prepare, token, finish and
`cancelOperation` shape.
