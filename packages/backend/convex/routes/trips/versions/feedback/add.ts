import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripVersions } from '#convex/modules/travel/versions/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

export const run = workspaceMutation({
  args: {
    changeKey: v.optional(v.string()),
    content: v.string(),
    kind: v.optional(TripVersionValidators.commentKind),
    parentCommentId: v.optional(v.id('tripProposalComments')),
    proposalId: v.id('tripProposals')
  },
  returns: v.id('tripProposalComments'),
  handler: (ctx, { changeKey, content, kind, parentCommentId, proposalId }) =>
    TripVersions.addFeedback({
      changeKey,
      ctx,
      kind,
      parentCommentId,
      proposalId,
      rawContent: content
    })
});
