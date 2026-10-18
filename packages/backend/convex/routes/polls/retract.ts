import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';

export const run = workspaceMutation({
  args: { pollId: v.id('polls') },
  returns: v.null(),
  handler: (ctx, { pollId }) => Polls.retract(ctx, ctx.workspace, pollId)
});
