import { ConvexError, v } from 'convex/values';
import { action } from '#convex-generated/server';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { assistantScreenValidator } from '#convex/modules/assistant/agent/index';
import { AssistantChats } from '#convex/modules/assistant/chat/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';

export const run = action({
  args: { screen: assistantScreenValidator },
  returns: v.string(),
  handler: async (ctx, { screen }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    try {
      await aiRateLimiter.limit(ctx, 'assistantThreadCreate', {
        key: identity.tokenIdentifier,
        throws: true
      });
      return await AssistantChats.create(ctx, screen);
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
  }
});
