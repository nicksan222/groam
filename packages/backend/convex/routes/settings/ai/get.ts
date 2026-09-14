import { v } from 'convex/values';
import { publicAiSettings } from '#convex/modules/ai/settings';
import { aiKeyProviderValidator } from '#convex/modules/ai/validators';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: {},
  returns: v.object({
    baseUrl: v.union(v.string(), v.null()),
    canManage: v.boolean(),
    configured: v.boolean(),
    fromEnvironment: v.boolean(),
    model: v.union(v.string(), v.null()),
    provider: v.union(aiKeyProviderValidator, v.null())
  }),
  handler: async (ctx) => await publicAiSettings(ctx)
});
