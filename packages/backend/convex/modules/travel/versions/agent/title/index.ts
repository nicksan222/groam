import { v } from 'convex/values';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { internalMutation, internalQuery } from '#convex-generated/server';

export const context = internalQuery({
  args: { generation: v.number(), proposalId: v.id('tripProposals') },
  returns: v.union(
    v.null(),
    v.object({
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
