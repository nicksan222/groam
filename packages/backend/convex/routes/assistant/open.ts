import { ConvexError, v } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { AssistantSession, assistantScreenValidator } from '#convex/modules/assistant/agent/index';
import { action } from '#convex-generated/server';

/** Open a new private assistant thread for the signed-in user. Rate-limited on thread creation. */
export const run = action({
  args: { screen: assistantScreenValidator },
  returns: v.string(),
  handler: async (ctx, { screen }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    return await AssistantSession.open(ctx, screen, async () => {
      await aiRateLimiter.limit(ctx, 'assistantThreadCreate', {
        key: identity.tokenIdentifier,
        throws: true
      });
    });
  }
});
