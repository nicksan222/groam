import { v } from 'convex/values';
import { isOrganizationManager, workspaceQuery } from '#convex/modules/auth/workspace';
import { ReviewSettings } from '#convex/modules/travel/versions/settings';

export const run = workspaceQuery({
  args: {},
  returns: v.object({ canManage: v.boolean(), requiredApprovals: v.number() }),
  handler: async (ctx) => {
    const settings = await ReviewSettings.forOrganization(ctx, ctx.workspace.organizationId);
    return {
      canManage: isOrganizationManager(ctx.workspace.organizationRole),
      requiredApprovals: settings.requiredApprovals
    };
  }
});
