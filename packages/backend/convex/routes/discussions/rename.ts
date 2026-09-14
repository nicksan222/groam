import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: {
    discussionId: v.id('discussions'),
    title: v.string()
  },
  returns: v.null(),
  handler: (ctx, { discussionId, title }) => Discussions.rename(ctx, discussionId, title)
});
