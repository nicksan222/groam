import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { query } from '#convex-generated/server';

export const run = query({
  args: { discussionId: v.id('discussions') },
  returns: v.array(v.object({ emoji: v.string(), messageId: v.string(), userId: v.string() })),
  handler: (ctx, { discussionId }) => Discussions.listReactions(ctx, discussionId)
});
