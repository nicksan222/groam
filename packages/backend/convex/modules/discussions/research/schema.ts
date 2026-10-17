import { v } from 'convex/values';
import { DiscussionLinkValidators } from '#convex/modules/discussions/links/schema';
import { DiscussionValidators } from '#convex/modules/discussions/threads/schema';

export const ResearchValidators = {
  detail: v.object({
    brief: v.union(v.string(), v.null()),
    canManage: v.boolean(),
    createdBy: DiscussionValidators.author,
    id: v.id('discussions'),
    kind: v.literal('research'),
    lastMessage: v.union(DiscussionValidators.lastMessage, v.null()),
    links: v.array(DiscussionLinkValidators.resolvedLink),
    shortId: v.string(),
    threadId: v.union(v.string(), v.null()),
    title: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number(),
    writable: v.boolean()
  }),
  listed: v.object({
    brief: v.union(v.string(), v.null()),
    id: v.id('discussions'),
    kind: v.literal('research'),
    lastMessage: v.union(DiscussionValidators.lastMessage, v.null()),
    linkCount: v.number(),
    participantCount: v.number(),
    shortId: v.string(),
    title: v.string(),
    tripId: v.id('trips'),
    unread: v.boolean(),
    updatedAt: v.number()
  })
};
