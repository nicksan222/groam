import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const run = workspaceMutation({
  args: { proposalId: v.id('tripProposals'), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: (ctx, { proposalId, reason }) => TripVersions.close(ctx, proposalId, reason)
});
