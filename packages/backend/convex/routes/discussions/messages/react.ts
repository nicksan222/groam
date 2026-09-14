import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: {
    discussionId: v.id('discussions'),
    emoji: v.string(),
    messageId: v.string()
  },
  returns: v.null(),
  handler: (ctx, { discussionId, emoji, messageId }) =>
    Discussions.toggleReaction(ctx, discussionId, messageId, emoji)
});
