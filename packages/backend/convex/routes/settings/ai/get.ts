import { v } from 'convex/values';
import { publicChatGptSettings } from '#convex/modules/ai/chatgpt/settings';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: {},
  returns: v.object({
    available: v.boolean(),
    unavailableReason: v.union(v.string(), v.null()),
    activeConnectionId: v.union(v.id('chatgptConnections'), v.null()),
    planNoticeAcknowledged: v.boolean(),
    connections: v.array(
      v.object({
        id: v.id('chatgptConnections'),
        label: v.string(),
        email: v.union(v.string(), v.null()),
        clientId: v.string(),
        connected: v.boolean(),
        needsReconnect: v.boolean(),
        model: v.union(v.string(), v.null())
      })
    )
  }),
  handler: async (ctx) => await publicChatGptSettings(ctx, ctx.workspace.userId)
});
