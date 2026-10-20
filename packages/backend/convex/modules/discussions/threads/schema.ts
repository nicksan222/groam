import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';
import { chatAgentValidator } from '#convex/modules/assistant/validators/index';

const author = v.object({
  name: v.string(),
  userId: v.string()
});

const content = v.object({
  format: v.literal('plain_text'),
  text: v.string()
});

const conversationKind = v.union(v.literal('group'), v.literal('assistant'), v.literal('research'));

const discussionMember = v.object({
  image: v.union(v.string(), v.null()),
  name: v.string(),
  userId: v.string()
});

const lastMessage = v.object({
  authorName: v.string(),
  text: v.string()
});

const discussionBase = {
  clientRequestId: v.string(),
  createdBy: author,
  lastMessage: v.optional(lastMessage),
  organizationId: v.string(),
  shortId: v.string(),
  threadId: v.optional(v.string()),
  title: v.string(),
  updatedAt: v.number()
};

const messageMedia = v.object({
  contentType: v.string(),
  id: v.id('media'),
  name: v.string(),
  size: v.number(),
  url: v.union(v.string(), v.null())
});

export const DiscussionValidators = {
  author,
  lastMessage,
  listedDiscussion: v.object({
    createdBy: author,
    id: v.id('discussions'),
    shortId: v.string(),
    lastMessage: v.union(lastMessage, v.null()),
    members: v.array(discussionMember),
    threadId: v.union(v.string(), v.null()),
    title: v.string(),
    tripId: v.union(v.id('trips'), v.null()),
    tripName: v.union(v.string(), v.null()),
    unread: v.boolean(),
    updatedAt: v.number()
  }),
  member: discussionMember,
  message: content,
  messageMedia
};

export type DiscussionMember = Infer<typeof discussionMember>;
export type DiscussionMessageMedia = Infer<typeof messageMedia>;
export type MessageAuthor = Infer<typeof author>;
export type MessageContent = Infer<typeof content>;

export const discussionTables = {
  discussionMembers: defineTable({
    discussionId: v.id('discussions'),
    /** Copy of the discussion's kind, so a kind's lists read only their own rows. */
    kind: conversationKind,
    organizationId: v.string(),
    userId: v.string(),
    lastReadAt: v.optional(v.number())
  })
    .index('by_discussionId', ['discussionId'])
    .index('by_discussionId_and_userId', ['discussionId', 'userId'])
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_userId', ['organizationId', 'userId'])
    .index('by_organizationId_and_userId_and_kind', ['organizationId', 'userId', 'kind']),
  discussionMessageMedia: defineTable({
    mediaId: v.id('media'),
    messageId: v.id('discussionMessages')
  })
    .index('by_mediaId', ['mediaId'])
    .index('by_messageId', ['messageId']),
  discussionMessages: defineTable({
    agentMessageId: v.optional(v.string()),
    assistantAgent: v.optional(v.union(chatAgentValidator, v.literal('researcher'))),
    assistantStatus: v.optional(
      v.union(
        v.literal('requested'),
        v.literal('responding'),
        v.literal('complete'),
        v.literal('failed')
      )
    ),
    assistantClaimedAt: v.optional(v.number()),
    assistantError: v.optional(v.string()),
    author,
    clientRequestId: v.string(),
    content: DiscussionValidators.message,
    discussionId: v.id('discussions'),
    mediaIds: v.optional(v.array(v.id('media'))),
    organizationId: v.string(),
    deletedAt: v.optional(v.number()),
    editedAt: v.optional(v.number())
  })
    .index('by_discussionId', ['discussionId'])
    .index('by_discussionId_and_agentMessageId', ['discussionId', 'agentMessageId'])
    .index('by_discussionId_and_author_userId_and_clientRequestId', [
      'discussionId',
      'author.userId',
      'clientRequestId'
    ])
    .index('by_organizationId', ['organizationId']),
  discussions: defineTable(
    v.union(
      v.object({
        ...discussionBase,
        kind: v.literal('group'),
        members: v.array(discussionMember),
        tripId: v.optional(v.id('trips'))
      }),
      // Phase 2 adds the personal assistant chat fields.
      v.object({ ...discussionBase, kind: v.literal('assistant') }),
      v.object({
        ...discussionBase,
        brief: v.optional(v.string()),
        /** Set when removal starts; the research is unreachable from then on. */
        deletingAt: v.optional(v.number()),
        kind: v.literal('research'),
        /** Denormalized so the trip list reads no link rows. */
        linkCount: v.number(),
        /** Denormalized so the trip list reads no participation rows. */
        participantCount: v.number(),
        tripId: v.id('trips')
      })
    )
  )
    .index('by_shortId', ['shortId'])
    .index('by_organizationId', ['organizationId'])
    .index('by_threadId', ['threadId'])
    .index('by_organizationId_and_kind_and_updatedAt', ['organizationId', 'kind', 'updatedAt'])
    .index('by_tripId_and_kind_and_updatedAt', ['tripId', 'kind', 'updatedAt'])
    .index('by_organizationId_and_createdBy_userId_and_clientRequestId', [
      'organizationId',
      'createdBy.userId',
      'clientRequestId'
    ]),
  discussionMessageReactions: defineTable({
    discussionId: v.id('discussions'),
    emoji: v.string(),
    messageId: v.string(),
    organizationId: v.string(),
    userId: v.string()
  })
    .index('by_discussionId_and_messageId', ['discussionId', 'messageId'])
    .index('by_discussionId_and_messageId_and_userId_and_emoji', [
      'discussionId',
      'messageId',
      'userId',
      'emoji'
    ])
};
