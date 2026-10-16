import { v } from 'convex/values';
import { selectChatGptConnection } from '#convex/modules/ai/chatgpt/settings';
import { workspaceMutation } from '#convex/modules/auth/workspace';

export const run = workspaceMutation({
  args: { connectionId: v.id('chatgptConnections'), model: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { connectionId, model }) =>
    await selectChatGptConnection(ctx, ctx.workspace.userId, connectionId, model)
});
