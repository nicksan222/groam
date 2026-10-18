import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const run = workspaceMutation({
  args: {
    commentId: v.id('tripProposalComments'),
    proposalId: v.id('tripProposals'),
    resolved: v.boolean()
  },
  returns: v.null(),
  handler: (ctx, { commentId, proposalId, resolved }) =>
    TripVersions.resolveFeedback(ctx, proposalId, commentId, resolved)
});
