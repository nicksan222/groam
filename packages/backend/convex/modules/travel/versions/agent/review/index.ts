import { v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const context = internalQuery({
  args: { proposalId: v.id('tripProposals') },
  returns: v.object({
    changes: v.array(
      v.object({
        change: v.union(v.literal('added'), v.literal('modified'), v.literal('removed')),
        entity: v.string(),
        fields: v.array(
          v.object({
            after: v.any(),
            before: v.any(),
            display: v.union(v.literal('media'), v.literal('value')),
            format: v.any(),
            key: v.string(),
            label: v.string(),
            mediaAfter: v.any(),
            mediaBefore: v.any()
          })
        ),
        key: v.string(),
        label: v.string()
      })
    ),
    expectedReviewRevision: v.string(),
    organizationId: v.string(),
    sourceTripId: v.id('trips'),
    title: v.string(),
    workingTripId: v.id('trips')
  }),
  handler: (ctx, { proposalId }) => TripVersions.reviewContext(ctx, proposalId)
});

export const finish = internalMutation({
  args: {
    comments: v.array(
      v.object({
        body: v.string(),
        kind: v.union(v.literal('comment'), v.literal('change_request'))
      })
    ),
    proposalId: v.id('tripProposals'),
    expectedReviewRevision: v.string(),
    runId: v.id('agentRuns'),
    summary: v.string(),
    verdict: v.union(v.literal('approve'), v.literal('request_changes'), v.literal('comment'))
  },
  returns: v.null(),
  handler: (ctx, { proposalId, ...review }) =>
    TripVersions.finishAgentReview(ctx, proposalId, review)
});
