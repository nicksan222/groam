import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

/** Newest open polls the viewer can read across trips, the group, and chats (at most 10). */
export const run = workspaceQuery({
  args: {},
  returns: v.array(PollValidators.openItem),
  handler: (ctx) => Polls.listOpen(ctx, ctx.workspace)
});
