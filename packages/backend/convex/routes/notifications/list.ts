import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Notifications } from '#convex/modules/notifications/index';
import { NotificationValidators } from '#convex/modules/notifications/schema';

export const run = workspaceQuery({
  args: {},
  returns: v.array(NotificationValidators.item),
  handler: (ctx) => Notifications.list(ctx, ctx.workspace)
});
