import { v } from 'convex/values';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { internalMutation, internalQuery } from '#convex-generated/server';

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
    organizationId: v.string(),
    sourceTripId: v.id('trips'),
    title: v.string(),
    workingTripId: v.id('trips')
  }),
  handler: async (ctx, { proposalId }) => {
    const proposal = await TripVersions.get(ctx, proposalId);
    if (!proposal.reviewers.some((reviewer) => reviewer.kind === 'agent')) {
      throw new Error('Idea reviewer is not assigned to review this proposal');
    }
    if (proposal.status !== 'in_review' && proposal.status !== 'conflicted') {
      throw new Error('Submit the proposal before requesting idea review');
    }
    const stored = await ctx.db.get('tripProposals', proposalId);
    if (!stored) throw new Error('Proposal not found');
    return {
      changes: proposal.changes,
      organizationId: stored.organizationId,
      sourceTripId: stored.sourceTripId,
      title: proposal.title,
      workingTripId: stored.workingTripId
    };
  }
});

export const finish = internalMutation({
  args: {
    comments: v.array(v.string()),
    proposalId: v.id('tripProposals'),
    summary: v.string()
  },
  returns: v.null(),
  handler: (ctx, { comments, proposalId, summary }) =>
    TripVersions.finishAgentReview(ctx, proposalId, summary, comments)
});
