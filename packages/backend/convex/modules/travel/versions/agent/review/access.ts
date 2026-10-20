import { ConvexError, v } from 'convex/values';
import { internalQuery } from '#convex-generated/server';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

/** The public reviewer requires membership and participation on the proposal's source trip. */
export const assertProposalInOrganization = internalQuery({
  args: { organizationId: v.string(), proposalId: v.id('tripProposals') },
  returns: v.null(),
  handler: async (ctx, { organizationId, proposalId }) => {
    const workspace = await requireWorkspace(ctx);
    const proposal = await ctx.db.get('tripProposals', proposalId);
    const trip = proposal ? await findVisibleTrip(ctx, proposal.sourceTripId, workspace) : null;
    if (
      !trip ||
      proposal?.organizationId !== organizationId ||
      workspace.organizationId !== organizationId
    ) {
      throw new ConvexError('Idea trip not found');
    }
    return null;
  }
});
