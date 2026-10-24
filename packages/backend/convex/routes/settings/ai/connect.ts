import { v } from 'convex/values';
import { beginChatGptConnection } from '#convex/modules/ai/chatgpt/actions';
import { workspaceAction } from '#convex/modules/auth/workspace';

export const run = workspaceAction({
  args: { connectionId: v.optional(v.id('chatgptConnections')) },
  returns: v.object({ authorizationUrl: v.string() }),
  handler: async (ctx, { connectionId }) =>
    await beginChatGptConnection(ctx, ctx.workspace.userId, connectionId)
});
