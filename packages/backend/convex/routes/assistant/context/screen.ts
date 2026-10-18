import { ConvexError, v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { mutation } from '#convex-generated/server';
import { AssistantScreens, assistantScreenValidator } from '#convex/modules/assistant/screen/index';

export const run = mutation({
  args: {
    screen: assistantScreenValidator,
    threadId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, { screen, threadId }) => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError('Not authenticated');
    AssistantScreens.validate(screen);
    await ctx.runMutation(internal.modules.assistant.model.index.setScreenContext, {
      screenContext: JSON.stringify(screen),
      threadId
    });
    return null;
  }
});
