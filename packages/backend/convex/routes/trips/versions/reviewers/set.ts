import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

export const run = workspaceMutation({
  args: {
    proposalId: v.id('tripProposals'),
    reviewers: v.array(TripVersionValidators.reviewer)
  },
  returns: v.null(),
  handler: (ctx, { proposalId, reviewers }) => TripVersions.setReviewers(ctx, proposalId, reviewers)
});
