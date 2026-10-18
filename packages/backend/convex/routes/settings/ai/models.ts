import { v } from 'convex/values';
import { chatGptModels } from '#convex/modules/ai/chatgpt/actions';
import { workspaceAction } from '#convex/modules/auth/workspace';

export const run = workspaceAction({
  args: { connectionId: v.id('chatgptConnections') },
  returns: v.array(v.object({ slug: v.string(), displayName: v.string() })),
  handler: async (ctx, { connectionId }) =>
    await chatGptModels(ctx, ctx.workspace.userId, connectionId)
});
