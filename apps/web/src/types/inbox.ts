import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type InboxNotification = FunctionReturnType<
  typeof api.routes.notifications.list.run
>[number];
