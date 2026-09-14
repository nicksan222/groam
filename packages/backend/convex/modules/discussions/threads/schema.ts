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

const discussionMember = v.object({
  image: v.union(v.string(), v.null()),
  name: v.string(),
  userId: v.string()
});

const lastMessage = v.object({
  authorName: v.string(),
  text: v.string()
});

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
    shortId: v.optional(v.string()),
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
    organizationId: v.string(),
    userId: v.string(),
    lastReadAt: v.optional(v.number())
  })
    .index('by_discussionId', ['discussionId'])
    .index('by_discussionId_and_userId', ['discussionId', 'userId'])
    .index('by_organizationId', ['organizationId'])
    .index('by_organizationId_and_userId', ['organizationId', 'userId']),
  discussionMessageMedia: defineTable({
    mediaId: v.id('media'),
    messageId: v.id('discussionMessages')
  })
    .index('by_mediaId', ['mediaId'])
    .index('by_messageId', ['messageId']),
  discussionMessages: defineTable({
    agentMessageId: v.optional(v.string()),
    assistantAgent: v.optional(chatAgentValidator),
    assistantStatus: v.optional(
      v.union(
        v.literal('requested'),
        v.literal('responding'),
        v.literal('complete'),
        v.literal('failed')
      )
    ),
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
  discussions: defineTable({
    shortId: v.optional(v.string()),
    clientRequestId: v.string(),
    createdBy: author,
    lastMessage: v.optional(lastMessage),
    members: v.array(discussionMember),
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    title: v.string(),
    tripId: v.optional(v.id('trips')),
    updatedAt: v.number()
  })
    .index('by_shortId', ['shortId'])
    .index('by_organizationId', ['organizationId'])
    .index('by_threadId', ['threadId'])
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
