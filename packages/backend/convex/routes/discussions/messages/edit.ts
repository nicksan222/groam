import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Discussions } from '#convex/modules/discussions/threads/index';

export const run = mutation({
  args: {
    discussionId: v.id('discussions'),
    messageId: v.string(),
    text: v.string()
  },
  returns: v.null(),
  handler: (ctx, { discussionId, messageId, text }) =>
    Discussions.editMessage(ctx, discussionId, messageId, text)
});
