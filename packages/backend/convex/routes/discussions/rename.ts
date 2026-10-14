import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Discussions } from '#convex/modules/discussions/threads/index';

export const run = mutation({
  args: {
    discussionId: v.id('discussions'),
    title: v.string()
  },
  returns: v.null(),
  handler: (ctx, { discussionId, title }) => Discussions.rename(ctx, discussionId, title)
});
