import { abortStream } from '@convex-dev/agent';
import { v } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import { mutation } from '#convex-generated/server';

/** Abort an in-flight private assistant stream. Verifies thread access before aborting. */
export const run = mutation({
  args: {
    order: v.number(),
    threadId: v.string()
  },
  returns: v.boolean(),
  handler: async (ctx, { order, threadId }) => {
    await ctx.runQuery(internal.modules.assistant.model.index.access, { threadId });
    return await abortStream(ctx, components.agent, {
      order,
      reason: 'Stopped by traveler',
      threadId
    });
  }
});
