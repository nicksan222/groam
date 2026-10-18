import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useMutation, useQuery } from 'convex/react';

export function useWorkspaceNotifications() {
  const notifications = useQuery(api.routes.notifications.list.run, {});
  const markRead = useMutation(api.routes.notifications.mark.read.run);
  const markAllRead = useMutation(api.routes.notifications.mark.all.run);
  const unread = notifications?.filter((item) => item.readAt === null).length ?? 0;

  return {
    isLoading: notifications === undefined,
    markAllRead: () => markAllRead({}),
    markNotificationRead: (notificationId: Id<'workspaceNotifications'>) =>
      markRead({ notificationId }),
    notifications: notifications ?? [],
    unread
  };
}
