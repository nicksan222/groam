import { v } from 'convex/values';
import { publicAiSettings } from '#convex/modules/ai/settings';
import { aiKeyProviderValidator } from '#convex/modules/ai/validators';
import { workspaceQuery } from '#convex/modules/auth/workspace';

export const run = workspaceQuery({
  args: {},
  returns: v.object({
    canManageOrganization: v.boolean(),
    effectiveSource: v.union(
      v.literal('deployment'),
      v.literal('organization'),
      v.literal('personal'),
      v.literal('unconfigured')
    ),
    environmentConfigured: v.boolean(),
    organizationId: v.string(),
    organization: v.object({
      baseUrl: v.union(v.string(), v.null()),
      configured: v.boolean(),
      model: v.union(v.string(), v.null()),
      provider: v.union(aiKeyProviderValidator, v.null())
    }),
    personal: v.object({
      baseUrl: v.union(v.string(), v.null()),
      configured: v.boolean(),
      model: v.union(v.string(), v.null()),
      provider: v.union(aiKeyProviderValidator, v.null())
    })
  }),
  handler: async (ctx) => await publicAiSettings(ctx)
});
