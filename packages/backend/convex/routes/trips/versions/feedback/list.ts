import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

export const run = workspaceQuery({
  args: { proposalId: v.id('tripProposals') },
  returns: v.array(
    v.object({
      author: TripVersionValidators.commentAuthor,
      changeKey: v.union(v.string(), v.null()),
      content: v.string(),
      createdAt: v.number(),
      id: v.id('tripProposalComments'),
      kind: TripVersionValidators.commentKind,
      parentCommentId: v.union(v.id('tripProposalComments'), v.null()),
      resolvedAt: v.union(v.number(), v.null()),
      updatedAt: v.number()
    })
  ),
  handler: (ctx, { proposalId }) => TripVersions.listFeedback(ctx, proposalId)
});
