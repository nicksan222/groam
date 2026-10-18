import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceQuery({
  args: { discussionId: v.id('discussions') },
  returns: v.array(PollValidators.view),
  handler: (ctx, { discussionId }) => Polls.listForDiscussion(ctx, ctx.workspace, discussionId)
});
