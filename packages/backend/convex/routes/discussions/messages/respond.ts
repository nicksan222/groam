import { ConvexError, v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { action } from '#convex-generated/server';
import { assistantScreenValidator } from '#convex/modules/assistant/agent/index';

/**
 * Claim a prompt message and start its assistant run. Auth + AI rate limit enforced;
 * no-ops when another client already claimed or finished the response. Stays an action so
 * shipped clients keep calling it; the reply streams from the run's workflow.
 */
export const run = action({
  args: {
    discussionId: v.id('discussions'),
    promptMessageId: v.string(),
    screen: assistantScreenValidator
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError('Not authenticated');
    return await ctx.runMutation(internal.modules.discussions.assistant.index.respond, args);
  }
});
