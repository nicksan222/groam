import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { ReviewSettings } from '#convex/modules/travel/versions/settings';

export const run = workspaceMutation({
  args: { requiredApprovals: v.number() },
  returns: v.null(),
  handler: (ctx, { requiredApprovals }) => ReviewSettings.set(ctx, requiredApprovals)
});
