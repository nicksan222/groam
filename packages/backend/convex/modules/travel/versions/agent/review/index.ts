import { v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { versionAgentChangesValidator } from '#convex/modules/travel/versions/validators';

export const context = internalQuery({
  args: { proposalId: v.id('tripProposals') },
  returns: v.object({
    changes: versionAgentChangesValidator,
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
