import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { Notifications } from '#convex/modules/notifications/index';

export const run = workspaceMutation({
  args: {},
  returns: v.null(),
  handler: (ctx) => Notifications.markAllRead(ctx, ctx.workspace)
});
