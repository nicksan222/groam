import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const run = workspaceMutation({
  args: { approved: v.boolean(), proposalId: v.id('tripProposals') },
  returns: v.null(),
  handler: (ctx, { approved, proposalId }) => TripVersions.setApproval(ctx, proposalId, approved)
});
