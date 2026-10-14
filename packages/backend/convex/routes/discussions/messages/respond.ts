import { v } from 'convex/values';
import { action } from '#convex-generated/server';
import { assistantScreenValidator } from '#convex/modules/assistant/agent/index';
import { DiscussionAssistant } from '#convex/modules/discussions/assistant/respond';

/**
 * Run the assistant reply for a claimed prompt message. Auth + AI rate limit enforced;
 * no-ops when another client already claimed or finished the response.
 */
export const run = action({
  args: {
    discussionId: v.id('discussions'),
    promptMessageId: v.string(),
    screen: assistantScreenValidator
  },
  returns: v.null(),
  handler: (ctx, args) => DiscussionAssistant.respond(ctx, args)
});
