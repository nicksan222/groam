import { v } from 'convex/values';
import { acknowledgeChatGptPlan } from '#convex/modules/ai/chatgpt/settings';
import { workspaceMutation } from '#convex/modules/auth/workspace';

export const run = workspaceMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => await acknowledgeChatGptPlan(ctx, ctx.workspace.userId)
});
