import { ConvexError, v } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import {
  AssistantSession,
  assistantScreenValidator,
  chatAgentValidator
} from '#convex/modules/assistant/agent/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { action } from '#convex-generated/server';

/** Continue a private assistant thread. Auth required; enforces per-user AI rate limits. */
export const run = action({
  args: {
    agent: chatAgentValidator,
    prompt: v.string(),
    screen: assistantScreenValidator,
    threadId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Not authenticated');
    try {
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: identity.tokenIdentifier,
        throws: true
      });
      return await AssistantSession.continue(ctx, args);
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
  }
});
