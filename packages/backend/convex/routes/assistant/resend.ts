import { ConvexError, v } from 'convex/values';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import {
  AssistantSession,
  assistantScreenValidator,
  chatAgentValidator
} from '#convex/modules/assistant/agent/index';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { action } from '#convex-generated/server';

/**
 * Edit and resend from a prior assistant turn (`order` / `stepOrder` from the UI message list).
 * Auth required; enforces the same AI rate limits as `send`.
 */
export const run = action({
  args: {
    agent: chatAgentValidator,
    messageId: v.string(),
    order: v.number(),
    prompt: v.string(),
    screen: assistantScreenValidator,
    stepOrder: v.number(),
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
      return await AssistantSession.resend(ctx, args);
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
  }
});
