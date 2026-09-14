import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';
import { versionConflictValidator } from '#convex/modules/travel/versions/validators';

const media = v.object({
  contentType: v.string(),
  id: v.string(),
  name: v.string(),
  size: v.number(),
  url: v.union(v.string(), v.null())
});

const change = v.object({
  change: v.union(v.literal('added'), v.literal('modified'), v.literal('removed')),
  entity: v.union(
    v.literal('activity'),
    v.literal('details'),
    v.literal('destination'),
    v.literal('packing'),
    v.literal('stay'),
    v.literal('transfer')
  ),
  fields: v.array(
    v.object({
      after: v.any(),
      before: v.any(),
      display: v.union(v.literal('media'), v.literal('value')),
      format: v.union(
        v.literal('date'),
        v.literal('destination'),
        v.literal('duration'),
        v.literal('money'),
        v.literal('schedule'),
        v.literal('text'),
        v.literal('travelMode'),
        v.null()
      ),
      key: v.string(),
      label: v.string(),
      mediaAfter: v.array(media),
      mediaBefore: v.array(media)
    })
  ),
  key: v.string(),
  label: v.string()
});

export const run = workspaceQuery({
  args: { proposalId: v.id('tripProposals') },
  returns: v.object({
    approvalCount: v.number(),
    approvals: v.array(v.object({ approvedAt: v.number(), name: v.string(), userId: v.string() })),
    author: TripVersionValidators.author,
    availableReviewers: v.array(
      v.object({ kind: v.literal('user'), name: v.string(), userId: v.string() })
    ),
    baseUpdatedAt: v.number(),
    ideaName: v.string(),
    canApprove: v.boolean(),
    canClose: v.boolean(),
    canManageReviewers: v.boolean(),
    canMerge: v.boolean(),
    canRebase: v.boolean(),
    canResolve: v.boolean(),
    changes: v.array(change),
    closeReason: v.union(v.string(), v.null()),
    conflicts: v.array(versionConflictValidator),
    feedbackCount: v.number(),
    groamReview: v.union(
      v.object({
        commentCount: v.number(),
        completedAt: v.number(),
        status: v.union(v.literal('changes_requested'), v.literal('passed')),
        summary: v.string()
      }),
      v.null()
    ),
    hasApproved: v.boolean(),
    id: v.id('tripProposals'),
    issue: v.union(
      v.object({
        id: v.id('tripIssues'),
        status: v.union(v.literal('open'), v.literal('closed')),
        title: v.string()
      }),
      v.null()
    ),
    requiredApprovals: v.number(),
    reviewers: v.array(TripVersionValidators.reviewer),
    sourceChanged: v.boolean(),
    sourceTripId: v.id('trips'),
    status: TripVersionValidators.status,
    submittedAt: v.union(v.number(), v.null()),
    title: v.string(),
    unresolvedFeedbackCount: v.number(),
    updatedAt: v.number(),
    workingTripId: v.id('trips')
  }),
  handler: async (ctx, { proposalId }) => {
    const detail = await TripVersions.get(ctx, proposalId);
    const { baseCommit: _base, mergeCommit: _merge, tipCommit: _tip, ...idea } = detail;
    return idea;
  }
});
