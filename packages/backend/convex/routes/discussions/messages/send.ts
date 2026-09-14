import { v } from 'convex/values';
import { chatAgentValidator } from '#convex/modules/assistant/validators/index';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { mutation } from '#convex-generated/server';

/**
 * Post a group message. Returns the saved message id and any @mentioned assistant agent
 * to pass into `messages/respond`. Requires discussion membership.
 */
export const run = mutation({
  args: {
    assistantAgent: v.optional(chatAgentValidator),
    clientRequestId: v.string(),
    discussionId: v.id('discussions'),
    mediaIds: v.optional(v.array(v.id('media'))),
    text: v.string()
  },
  returns: v.object({
    assistantAgent: v.union(chatAgentValidator, v.null()),
    messageId: v.string()
  }),
  handler: (ctx, args) =>
    Discussions.send(
      ctx,
      args.discussionId,
      args.text,
      args.clientRequestId,
      args.assistantAgent,
      args.mediaIds
    )
});
