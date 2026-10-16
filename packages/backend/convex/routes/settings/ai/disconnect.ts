import { v } from 'convex/values';
import { disconnectChatGptConnection } from '#convex/modules/ai/chatgpt/actions';
import { workspaceAction } from '#convex/modules/auth/workspace';

export const run = workspaceAction({
  args: { connectionId: v.id('chatgptConnections') },
  returns: v.object({ revoked: v.boolean() }),
  handler: async (ctx, { connectionId }): Promise<{ revoked: boolean }> =>
    await disconnectChatGptConnection(ctx, ctx.workspace.userId, connectionId)
});
