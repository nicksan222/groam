import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceQuery({
  args: { pollId: v.id('polls') },
  returns: PollValidators.view,
  handler: (ctx, { pollId }) => Polls.get(ctx, ctx.workspace, pollId)
});
