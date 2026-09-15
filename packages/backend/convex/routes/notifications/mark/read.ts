import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { Notifications } from '#convex/modules/notifications/index';

export const run = workspaceMutation({
  args: { notificationId: v.id('workspaceNotifications') },
  returns: v.null(),
  handler: (ctx, { notificationId }) => Notifications.markRead(ctx, ctx.workspace, notificationId)
});
