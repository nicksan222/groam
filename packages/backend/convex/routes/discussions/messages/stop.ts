import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { mutation } from '#convex-generated/server';

/** Abort an in-flight assistant stream for this discussion thread. Requires discussion access. */
export const run = mutation({
  args: {
    discussionId: v.id('discussions'),
    order: v.number(),
    threadId: v.string()
  },
  returns: v.boolean(),
  handler: (ctx, { discussionId, order, threadId }) =>
    Discussions.stop(ctx, discussionId, threadId, order)
});
