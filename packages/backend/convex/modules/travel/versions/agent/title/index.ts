import { v } from 'convex/values';
import { internalMutation, internalQuery } from '#convex-generated/server';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { versionAgentChangesValidator } from '#convex/modules/travel/versions/validators';

export const context = internalQuery({
  args: { generation: v.number(), proposalId: v.id('tripProposals') },
  returns: v.union(
    v.null(),
    v.object({
      credentialOwnerUserId: v.string(),
      changes: versionAgentChangesValidator,
      issueTitle: v.union(v.string(), v.null()),
      organizationId: v.string(),
      sourceTripName: v.string(),
      title: v.string()
    })
  ),
  handler: (ctx, { generation, proposalId }) =>
    TripVersions.titleContext(ctx, proposalId, generation)
});

export const finish = internalMutation({
  args: {
    generation: v.number(),
    proposalId: v.id('tripProposals'),
    title: v.string()
  },
  returns: v.null(),
  handler: (ctx, { generation, proposalId, title }) =>
    TripVersions.finishGeneratedTitle(ctx, proposalId, generation, title)
});
