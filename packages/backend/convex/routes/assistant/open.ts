import { ConvexError, v } from 'convex/values';
import { action } from '#convex-generated/server';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { AssistantSession, assistantScreenValidator } from '#convex/modules/assistant/agent/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';

/** Open a new private assistant thread for the signed-in user. Rate-limited on thread creation. */
export const run = action({
  args: { screen: assistantScreenValidator },
  returns: v.string(),
  handler: async (ctx, { screen }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    try {
      return await AssistantSession.open(ctx, screen, async () => {
        await aiRateLimiter.limit(ctx, 'assistantThreadCreate', {
          key: identity.tokenIdentifier,
          throws: true
        });
      });
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
  }
});
