import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const kind = v.union(
  v.literal('idea_applied'),
  v.literal('idea_passed'),
  v.literal('idea_shared'),
  v.literal('trip_invite')
);

const item = v.object({
  body: v.string(),
  createdAt: v.number(),
  href: v.string(),
  id: v.id('workspaceNotifications'),
  kind,
  readAt: v.union(v.number(), v.null()),
  title: v.string()
});

export const NotificationValidators = {
  item,
  kind
};

export const notificationTables = {
  workspaceNotifications: defineTable({
    body: v.string(),
    href: v.string(),
    kind,
    organizationId: v.string(),
    readAt: v.optional(v.number()),
    title: v.string(),
    userId: v.string()
  }).index('by_organizationId_and_userId', ['organizationId', 'userId'])
};
