import { v } from 'convex/values';
import { saveAiSettings } from '#convex/modules/ai/settings';
import { aiKeyProviderValidator } from '#convex/modules/ai/validators';
import { workspaceMutation } from '#convex/modules/auth/workspace';

export const run = workspaceMutation({
  args: {
    apiKey: v.union(v.string(), v.null()),
    baseUrl: v.union(v.string(), v.null()),
    model: v.union(v.string(), v.null()),
    provider: aiKeyProviderValidator
  },
  returns: v.null(),
  handler: async (ctx, args) => await saveAiSettings(ctx, args)
});
