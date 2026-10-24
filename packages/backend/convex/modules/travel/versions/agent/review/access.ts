import { ConvexError, v } from 'convex/values';
import { internalQuery } from '#convex-generated/server';

/** Throws unless the proposal's trip belongs to the caller's organization. */
export const assertProposalInOrganization = internalQuery({
  args: { organizationId: v.string(), proposalId: v.id('tripProposals') },
  returns: v.null(),
  handler: async (ctx, { organizationId, proposalId }) => {
    const proposal = await ctx.db.get('tripProposals', proposalId);
    const trip = proposal ? await ctx.db.get('trips', proposal.sourceTripId) : null;
    if (!trip || trip.organizationId !== organizationId) {
      throw new ConvexError('Idea trip not found');
    }
    return null;
  }
});
