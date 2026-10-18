import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';

export const run = workspaceMutation({
  args: { optionIds: v.array(v.string()), pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { optionIds, pollId }) => Polls.vote(ctx, ctx.workspace, pollId, optionIds)
});
