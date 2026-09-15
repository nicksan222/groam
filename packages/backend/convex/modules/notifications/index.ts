import { ConvexError, type Infer } from 'convex/values';
import type { Workspace } from '#convex/modules/auth/workspace';
import type { NotificationValidators } from '#convex/modules/notifications/schema';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_NOTIFICATIONS = 50;
const MAX_RECIPIENTS = 100;

export type NotificationKind = Infer<typeof NotificationValidators.kind>;

export async function notify(
  ctx: MutationCtx,
  input: {
    body: string;
    href: string;
    kind: NotificationKind;
    organizationId: string;
    title: string;
    userIds: string[];
  }
): Promise<void> {
  const uniqueUserIds = [...new Set(input.userIds)].slice(0, MAX_RECIPIENTS);
  await Promise.all(
    uniqueUserIds.map((userId) =>
      ctx.db.insert('workspaceNotifications', {
        body: input.body,
        href: input.href,
        kind: input.kind,
        organizationId: input.organizationId,
        title: input.title,
        userId
      })
    )
  );
}

export async function listNotifications(ctx: QueryCtx, workspace: Workspace) {
  const rows = await ctx.db
    .query('workspaceNotifications')
    .withIndex('by_organizationId_and_userId', (query) =>
      query.eq('organizationId', workspace.organizationId).eq('userId', workspace.userId)
    )
    .order('desc')
    .take(MAX_NOTIFICATIONS);
  return rows.map((row) => ({
    body: row.body,
    createdAt: row._creationTime,
    href: row.href,
    id: row._id,
    kind: row.kind,
    readAt: row.readAt ?? null,
    title: row.title
  }));
}

export async function markNotificationRead(
  ctx: MutationCtx,
  workspace: Workspace,
  notificationId: Id<'workspaceNotifications'>
): Promise<null> {
  const notification = await ctx.db.get('workspaceNotifications', notificationId);
  if (
    !notification ||
    notification.organizationId !== workspace.organizationId ||
    notification.userId !== workspace.userId
  ) {
    throw new ConvexError('Notification not found');
  }
  if (notification.readAt === undefined) {
    await ctx.db.patch('workspaceNotifications', notificationId, { readAt: Date.now() });
  }
  return null;
}

export async function markAllNotificationsRead(
  ctx: MutationCtx,
  workspace: Workspace
): Promise<null> {
  const rows = await ctx.db
    .query('workspaceNotifications')
    .withIndex('by_organizationId_and_userId', (query) =>
      query.eq('organizationId', workspace.organizationId).eq('userId', workspace.userId)
    )
    .take(MAX_NOTIFICATIONS);
  const now = Date.now();
  await Promise.all(
    rows
      .filter((row) => row.readAt === undefined)
      .map((row) => ctx.db.patch('workspaceNotifications', row._id, { readAt: now }))
  );
  return null;
}

/** Workspace inbox for idea and invite events. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class Notifications {
  static list = listNotifications;
  static markAllRead = markAllNotificationsRead;
  static markRead = markNotificationRead;
  static notify = notify;
}
