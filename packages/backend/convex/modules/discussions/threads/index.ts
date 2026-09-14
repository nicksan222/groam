import {
  abortStream,
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  updateThreadMetadata,
  type vStreamArgs
} from '@convex-dev/agent';
import {
  assistantAgents,
  assistantThreadSummary,
  type ChatAgentId,
  mentionedAssistantAgent
} from '@groam/ai-contracts/agents/registry';
import type { PaginationOptions } from 'convex/server';
import { ConvexError, type Infer } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { requireWorkspace, type Workspace, workspaceRoster } from '#convex/modules/auth/workspace';
import {
  DiscussionMedia,
  type DiscussionMessageMedia
} from '#convex/modules/discussions/media/index';
import { Messages } from '#convex/modules/discussions/messages/index';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import {
  discussionRateLimiter,
  MAX_DISCUSSION_MEMBERS,
  MAX_DISCUSSIONS_PER_USER,
  MAX_MESSAGE_ATTACHMENT_RECEIPTS,
  MAX_TITLE_LENGTH
} from '#convex/modules/discussions/threads/limits';
import type { DiscussionMember } from '#convex/modules/discussions/threads/schema';
import { insertWithShortId } from '#convex/modules/references/index';
import { components } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export type { DiscussionMessageMedia } from '#convex/modules/discussions/media/index';
export type { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

const assistantAuthor = { name: 'Groam', userId: 'groam-ai' };

export type DiscussionAssistantClaim = {
  agent: ChatAgentId;
  expectedUpdatedAt: number;
  prompt: string;
  runId: Id<'agentRuns'>;
  threadId: string;
};

export type DiscussionSendResult = {
  assistantAgent: ChatAgentId | null;
  messageId: string;
};

function sameMembers(left: DiscussionMember[], right: DiscussionMember[]): boolean {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right.map((member) => member.userId));
  return left.every((member) => rightIds.has(member.userId));
}

function normalizeTitle(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > MAX_TITLE_LENGTH) {
    throw new ConvexError(`Discussion titles must contain 1 to ${MAX_TITLE_LENGTH} characters`);
  }
  return normalized;
}

function displayUserMessageText(
  receiptText: string,
  agentText: string,
  attachments: DiscussionMessageMedia[]
): string {
  if (receiptText.length > 0) return receiptText;
  if (agentText.trim().length > 0) return agentText;
  return attachments.length > 0 ? DiscussionMedia.previewLabel(attachments) : agentText;
}

/**
 * Shared group chats. Routes and other modules call this class, not entity helpers.
 * `DiscussionAccess` is the membership gate; `Messages` / `DiscussionMedia` own text and files.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class Discussions {
  static async require(
    ctx: MutationCtx | QueryCtx,
    discussionId: Id<'discussions'>
  ): Promise<DiscussionAccess> {
    return await DiscussionAccess.require(ctx, discussionId);
  }

  static async requireMessages(
    ctx: MutationCtx | QueryCtx,
    discussionId: Id<'discussions'>,
    threadId: string,
    paginationOpts: PaginationOptions
  ): Promise<DiscussionAccess> {
    return await DiscussionAccess.requireMessages(ctx, discussionId, threadId, paginationOpts);
  }

  static async requireThread(
    ctx: MutationCtx | QueryCtx,
    threadId: string,
    workspace?: Workspace
  ): Promise<DiscussionAccess> {
    return await DiscussionAccess.requireThread(ctx, threadId, workspace);
  }

  /** Agent message id → attachments, for the chat UI that lists files beside bubbles. */
  static async listMessageAttachments(ctx: QueryCtx, discussionId: Id<'discussions'>) {
    const { discussion } = await DiscussionAccess.require(ctx, discussionId);
    const receipts = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId', (query) => query.eq('discussionId', discussionId))
      .take(MAX_MESSAGE_ATTACHMENT_RECEIPTS);
    const byAgentMessageId: Record<string, DiscussionMessageMedia[]> = {};
    const loaded = await Promise.all(
      receipts.map(async (receipt) => {
        if (!receipt.agentMessageId) return null;
        const attachments = await DiscussionMedia.load(
          ctx,
          discussion.organizationId,
          await DiscussionMedia.idsForReceipt(ctx, receipt)
        );
        if (attachments.length === 0) return null;
        return [receipt.agentMessageId, attachments] as const;
      })
    );
    for (const entry of loaded) {
      if (entry) byAgentMessageId[entry[0]] = entry[1];
    }
    return byAgentMessageId;
  }

  /**
   * Merge Agent UI messages with our receipts. Stream-only subscriptions pass an
   * empty page (`numItems: 0`) via `streamArgs`.
   */
  static async listMessages(
    ctx: QueryCtx,
    args: {
      discussionId: Id<'discussions'>;
      paginationOpts: PaginationOptions;
      streamArgs?: Infer<typeof vStreamArgs>;
      threadId: string;
    }
  ) {
    // useUIMessages subscribes to stream deltas with an intentionally empty message page.
    DiscussionAccess.validatePagination(args.paginationOpts, args.streamArgs !== undefined);
    const { discussion, workspace } = await DiscussionAccess.require(ctx, args.discussionId);
    if (discussion.threadId !== args.threadId) throw new ConvexError('Discussion not found');
    const [messages, streams] = await Promise.all([
      listUIMessages(ctx, components.agent, args),
      syncStreams(ctx, components.agent, args)
    ]);
    const membersById = new Map(discussion.members.map((member) => [member.userId, member]));
    const page = await Promise.all(
      messages.page.map(async (message) => {
        const receipt =
          message.role === 'user'
            ? await ctx.db
                .query('discussionMessages')
                .withIndex('by_discussionId_and_agentMessageId', (query) =>
                  query.eq('discussionId', args.discussionId).eq('agentMessageId', message.id)
                )
                .unique()
            : null;
        const participant =
          (message.userId ? membersById.get(message.userId) : null) ?? receipt?.author;
        const attachments = receipt
          ? await DiscussionMedia.load(
              ctx,
              discussion.organizationId,
              await DiscussionMedia.idsForReceipt(ctx, receipt)
            )
          : [];
        const receiptText = receipt?.deletedAt ? '' : (receipt?.content.text?.trim() ?? '');
        const displayText = receipt?.deletedAt
          ? 'This message was deleted'
          : message.role === 'user' && receipt
            ? displayUserMessageText(receiptText, message.text, attachments)
            : message.text;
        return {
          ...message,
          attachments,
          author:
            message.role === 'assistant'
              ? assistantAuthor
              : (participant ?? {
                  name: 'Former participant',
                  userId: message.userId ?? 'former-participant'
                }),
          deleted: receipt?.deletedAt !== undefined,
          edited: receipt?.editedAt !== undefined,
          // Keep legacy `media` for older clients / optimistic messages.
          media: attachments,
          mine: message.role === 'user' && message.userId === workspace.userId,
          text: displayText
        };
      })
    );
    return { ...messages, page, streams };
  }

  static async create(
    ctx: MutationCtx,
    title: string,
    memberUserIds: string[],
    clientRequestId: string,
    tripId?: Id<'trips'>
  ): Promise<Id<'discussions'>> {
    const workspace = await requireWorkspace(ctx);
    const normalizedTitle = normalizeTitle(title);
    const normalizedRequestId = Messages.normalizeRequestId(clientRequestId, 'Discussion');
    const requestedUserIds = new Set(memberUserIds);
    requestedUserIds.add(workspace.userId);
    if (requestedUserIds.size < 2 || requestedUserIds.size > MAX_DISCUSSION_MEMBERS) {
      throw new ConvexError(
        `Discussions must include 2 to ${MAX_DISCUSSION_MEMBERS} group members`
      );
    }

    const roster = await workspaceRoster(ctx, workspace);
    const rosterById = new Map(roster.members.map((member) => [member.userId, member]));
    const members = [...requestedUserIds].map((userId) => {
      const member = rosterById.get(userId);
      if (!member) throw new ConvexError('Group member not found');
      return { image: member.image, name: member.name, userId: member.userId };
    });
    const existing = await ctx.db
      .query('discussions')
      .withIndex('by_organizationId_and_createdBy_userId_and_clientRequestId', (query) =>
        query
          .eq('organizationId', workspace.organizationId)
          .eq('createdBy.userId', workspace.userId)
          .eq('clientRequestId', normalizedRequestId)
      )
      .unique();
    if (existing) {
      if (existing.title !== normalizedTitle || !sameMembers(existing.members, members)) {
        throw new ConvexError('Discussion request id was already used');
      }
      return existing._id;
    }
    await discussionRateLimiter.limit(ctx, 'discussionCreate', {
      key: workspace.tokenIdentifier,
      throws: true
    });
    const membershipLists = await Promise.all(
      members.map((member) =>
        ctx.db
          .query('discussionMembers')
          .withIndex('by_organizationId_and_userId', (query) =>
            query.eq('organizationId', workspace.organizationId).eq('userId', member.userId)
          )
          .take(MAX_DISCUSSIONS_PER_USER)
      )
    );
    if (membershipLists.some((memberships) => memberships.length >= MAX_DISCUSSIONS_PER_USER)) {
      throw new ConvexError(`Discussion limit of ${MAX_DISCUSSIONS_PER_USER} reached`);
    }

    const now = Date.now();
    const [discussionId, threadId] = await Promise.all([
      insertWithShortId(ctx, 'discussions', {
        clientRequestId: normalizedRequestId,
        createdBy: { name: workspace.viewerName, userId: workspace.userId },
        members,
        organizationId: workspace.organizationId,
        title: normalizedTitle,
        ...(tripId ? { tripId } : {}),
        updatedAt: now
      }),
      createThread(ctx, components.agent, {
        summary: assistantThreadSummary(workspace.organizationId, [], now),
        title: normalizedTitle
      })
    ]);
    await ctx.db.patch('discussions', discussionId, { threadId });
    await Promise.all(
      members.map((member) =>
        ctx.db.insert('discussionMembers', {
          discussionId,
          organizationId: workspace.organizationId,
          userId: member.userId
        })
      )
    );
    return discussionId;
  }

  static async list(ctx: QueryCtx) {
    const workspace = await requireWorkspace(ctx);
    const memberships = await ctx.db
      .query('discussionMembers')
      .withIndex('by_organizationId_and_userId', (query) =>
        query.eq('organizationId', workspace.organizationId).eq('userId', workspace.userId)
      )
      .take(MAX_DISCUSSIONS_PER_USER + 1);
    if (memberships.length > MAX_DISCUSSIONS_PER_USER) {
      throw new ConvexError(`Discussion limit of ${MAX_DISCUSSIONS_PER_USER} exceeded`);
    }
    const discussions = await Promise.all(
      memberships.map(async (membership) => {
        const discussion = await ctx.db.get('discussions', membership.discussionId);
        if (!discussion || discussion.organizationId !== workspace.organizationId) return null;
        const trip = discussion.tripId ? await ctx.db.get('trips', discussion.tripId) : null;
        return {
          createdBy: discussion.createdBy,
          id: discussion._id,
          ...(discussion.shortId ? { shortId: discussion.shortId } : {}),
          lastMessage: discussion.lastMessage ?? null,
          members: discussion.members,
          threadId: discussion.threadId ?? null,
          title: discussion.title,
          tripId: discussion.tripId ?? null,
          tripName: trip?.name ?? null,
          unread:
            membership.lastReadAt === undefined || membership.lastReadAt < discussion.updatedAt,
          updatedAt: discussion.updatedAt
        };
      })
    );
    return discussions
      .filter((discussion): discussion is NonNullable<typeof discussion> => discussion !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  static async roster(ctx: QueryCtx) {
    const workspace = await requireWorkspace(ctx);
    const roster = await workspaceRoster(ctx, workspace);
    const others: {
      image: (typeof roster.members)[number]['image'];
      name: string;
      userId: string;
    }[] = [];
    for (const member of roster.members) {
      if (member.userId === workspace.userId) continue;
      others.push({ image: member.image, name: member.name, userId: member.userId });
    }
    return others.sort((left, right) => left.name.localeCompare(right.name));
  }

  /** Any current participant can rename. Title changes do not bump unread. */
  static async rename(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    title: string
  ): Promise<null> {
    const { discussion } = await DiscussionAccess.require(ctx, discussionId);
    const normalizedTitle = normalizeTitle(title);
    if (normalizedTitle === discussion.title) return null;
    await ctx.db.patch('discussions', discussion._id, { title: normalizedTitle });
    if (discussion.threadId) {
      await updateThreadMetadata(ctx, components.agent, {
        patch: { title: normalizedTitle },
        threadId: discussion.threadId
      });
    }
    return null;
  }

  /**
   * Send is idempotent on `(discussion, author, clientRequestId)`. Retrying the same
   * request returns the original agent message id. Empty text is allowed only with files.
   */
  static async send(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    text: string,
    clientRequestId: string,
    requestedAssistantAgent?: ChatAgentId,
    mediaIds: Id<'media'>[] = []
  ): Promise<DiscussionSendResult> {
    const { discussion, workspace } = await DiscussionAccess.require(ctx, discussionId);
    if (!discussion.threadId) {
      throw new ConvexError('This discussion must be upgraded before sending new messages');
    }
    const normalizedMediaIds = DiscussionMedia.normalizeIds(mediaIds);
    const media =
      normalizedMediaIds.length > 0
        ? await DiscussionMedia.require(ctx, workspace.organizationId, normalizedMediaIds)
        : [];
    const normalizedContent = Messages.normalizeContent(text, 'Message', {
      allowEmpty: media.length > 0
    });
    if (normalizedContent.text.length === 0 && media.length === 0) {
      throw new ConvexError('Message text must be between 1 and 5000 characters');
    }
    const agentPrompt =
      normalizedContent.text.length > 0
        ? normalizedContent.text
        : DiscussionMedia.previewLabel(media);
    const storedContent =
      normalizedContent.text.length > 0
        ? normalizedContent
        : { format: 'plain_text' as const, text: agentPrompt };
    const normalizedRequestId = Messages.normalizeRequestId(clientRequestId, 'Message');
    const assistantAgent =
      requestedAssistantAgent ?? mentionedAssistantAgent(normalizedContent.text)?.id ?? null;
    const existing = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_author_userId_and_clientRequestId', (query) =>
        query
          .eq('discussionId', discussionId)
          .eq('author.userId', workspace.userId)
          .eq('clientRequestId', normalizedRequestId)
      )
      .unique();
    if (existing) {
      if (
        existing.content.text !== storedContent.text ||
        !DiscussionMedia.sameIds(existing.mediaIds, normalizedMediaIds) ||
        !existing.agentMessageId
      ) {
        throw new ConvexError('Message request id was already used');
      }
      return {
        assistantAgent: existing.assistantAgent ?? null,
        messageId: existing.agentMessageId
      };
    }
    await discussionRateLimiter.limit(ctx, 'discussionMessage', {
      key: workspace.tokenIdentifier,
      throws: true
    });

    const { messageId } = await saveMessage(ctx, components.agent, {
      prompt: agentPrompt,
      threadId: discussion.threadId,
      userId: workspace.userId
    });
    const discussionMessageId = await ctx.db.insert('discussionMessages', {
      agentMessageId: messageId,
      ...(assistantAgent ? { assistantAgent, assistantStatus: 'requested' as const } : {}),
      author: { name: workspace.viewerName, userId: workspace.userId },
      clientRequestId: normalizedRequestId,
      content: storedContent,
      discussionId,
      ...(normalizedMediaIds.length > 0 ? { mediaIds: normalizedMediaIds } : {}),
      organizationId: workspace.organizationId
    });
    await Promise.all(
      normalizedMediaIds.map((mediaId) =>
        ctx.db.insert('discussionMessageMedia', {
          mediaId,
          messageId: discussionMessageId
        })
      )
    );
    await ctx.db.patch('discussions', discussion._id, {
      lastMessage: {
        authorName: workspace.viewerName,
        text: storedContent.text.slice(0, 160)
      },
      updatedAt: Date.now()
    });
    if (assistantAgent && discussion.threadId) {
      await AgentRuns.queueDiscussionTurn(ctx, {
        agentId: assistantAgent,
        createdBy: { name: workspace.viewerName, userId: workspace.userId },
        discussionId,
        organizationId: workspace.organizationId,
        threadId: discussion.threadId,
        title: discussion.title
      });
    }
    return { assistantAgent, messageId };
  }

  static async stop(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    threadId: string,
    order: number
  ): Promise<boolean> {
    await DiscussionAccess.requireMessages(ctx, discussionId, threadId, {
      cursor: null,
      numItems: 1
    });
    await AgentRuns.abortActiveForDiscussion(ctx, discussionId);
    return await abortStream(ctx, components.agent, {
      order,
      reason: 'Stopped by discussion participant',
      threadId
    });
  }

  static async mediaIsAttached(
    ctx: MutationCtx | QueryCtx,
    mediaId: Id<'media'>
  ): Promise<boolean> {
    return (
      (await ctx.db
        .query('discussionMessageMedia')
        .withIndex('by_mediaId', (query) => query.eq('mediaId', mediaId))
        .first()) !== null
    );
  }

  /**
   * Flip `requested` → `responding` so only one action streams this prompt.
   * Returns null when another client already claimed or finished it.
   */
  static async claimAssistantResponse(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    promptMessageId: string
  ): Promise<DiscussionAssistantClaim | null> {
    const { discussion, workspace } = await DiscussionAccess.require(ctx, discussionId);
    if (!discussion.threadId) throw new ConvexError('Discussion AI is unavailable');
    const request = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', promptMessageId)
      )
      .unique();
    if (!request || request.author.userId !== workspace.userId || !request.assistantAgent) {
      throw new ConvexError('AI request not found');
    }
    if (request.assistantStatus === 'complete' || request.assistantStatus === 'responding') {
      return null;
    }
    await ctx.db.patch('discussionMessages', request._id, { assistantStatus: 'responding' });
    const runId = await AgentRuns.claimDiscussionTurn(ctx, {
      agentId: request.assistantAgent,
      createdBy: { name: workspace.viewerName, userId: workspace.userId },
      discussionId,
      organizationId: workspace.organizationId,
      threadId: discussion.threadId,
      title: discussion.title
    });
    return {
      agent: request.assistantAgent,
      expectedUpdatedAt: discussion.updatedAt,
      prompt: request.content.text,
      runId,
      threadId: discussion.threadId
    };
  }

  /** Persist success/failure. Skips the last-message preview if the thread moved on. */
  static async finishAssistantResponse(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    promptMessageId: string,
    expectedUpdatedAt: number,
    responseText: string | null,
    runId: Id<'agentRuns'>,
    error?: string
  ): Promise<void> {
    const { discussion } = await DiscussionAccess.require(ctx, discussionId);
    const request = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', promptMessageId)
      )
      .unique();
    if (!request?.assistantAgent || request.assistantStatus !== 'responding') return;
    await ctx.db.patch('discussionMessages', request._id, {
      assistantStatus: responseText === null ? 'failed' : 'complete'
    });
    await AgentRuns.finish(ctx, {
      runId,
      status: responseText === null ? 'failed' : 'complete',
      ...(responseText === null
        ? { error: error ?? 'Assistant response failed' }
        : { report: responseText.trim() || 'Finished this discussion turn.' })
    });
    if (responseText === null || discussion.updatedAt !== expectedUpdatedAt) return;
    await ctx.db.patch('discussions', discussion._id, {
      lastMessage: {
        authorName: assistantAgents[request.assistantAgent].label,
        text: responseText.slice(0, 160)
      },
      updatedAt: Date.now()
    });
  }

  static async deleteOrganizationBatch(
    ctx: MutationCtx,
    organizationId: string,
    batchSize: number
  ): Promise<boolean> {
    const messages = await ctx.db
      .query('discussionMessages')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
      .take(batchSize);
    await Promise.all(
      messages.map(async (message) => {
        await DiscussionMedia.deleteRefs(ctx, message._id);
        await ctx.db.delete(message._id);
      })
    );
    if (messages.length > 0) return true;

    const members = await ctx.db
      .query('discussionMembers')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
      .take(batchSize);
    await Promise.all(members.map((member) => ctx.db.delete(member._id)));
    if (members.length > 0) return true;

    const discussions = await ctx.db
      .query('discussions')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
      .take(batchSize);
    await Promise.all(
      discussions.map(async (discussion) => {
        if (discussion.threadId) {
          await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
            limit: batchSize,
            threadId: discussion.threadId
          });
        }
        await ctx.db.delete(discussion._id);
      })
    );
    return discussions.length > 0;
  }

  static async removeOrganizationMemberBatch(
    ctx: MutationCtx,
    organizationId: string,
    userId: string,
    batchSize: number
  ): Promise<boolean> {
    const memberships = await ctx.db
      .query('discussionMembers')
      .withIndex('by_organizationId_and_userId', (query) =>
        query.eq('organizationId', organizationId).eq('userId', userId)
      )
      .take(batchSize);
    await Promise.all(
      memberships.map(async (membership) => {
        const discussion = await ctx.db.get('discussions', membership.discussionId);
        if (discussion?.organizationId === organizationId) {
          await ctx.db.patch('discussions', discussion._id, {
            members: discussion.members.filter((member) => member.userId !== userId)
          });
        }
        await ctx.db.delete(membership._id);
      })
    );
    return memberships.length === batchSize;
  }

  static async markRead(ctx: MutationCtx, discussionId: Id<'discussions'>): Promise<null> {
    const { discussion, workspace } = await DiscussionAccess.require(ctx, discussionId);
    const membership = await ctx.db
      .query('discussionMembers')
      .withIndex('by_discussionId_and_userId', (query) =>
        query.eq('discussionId', discussion._id).eq('userId', workspace.userId)
      )
      .unique();
    if (membership) {
      await ctx.db.patch('discussionMembers', membership._id, { lastReadAt: Date.now() });
    }
    return null;
  }

  static async toggleReaction(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    messageId: string,
    emoji: string
  ): Promise<null> {
    const { discussion, workspace } = await DiscussionAccess.require(ctx, discussionId);
    const normalized = emoji.trim();
    if (normalized.length === 0 || normalized.length > 8) {
      throw new ConvexError('Reaction must be a short emoji');
    }
    const existing = await ctx.db
      .query('discussionMessageReactions')
      .withIndex('by_discussionId_and_messageId_and_userId_and_emoji', (query) =>
        query
          .eq('discussionId', discussion._id)
          .eq('messageId', messageId)
          .eq('userId', workspace.userId)
          .eq('emoji', normalized)
      )
      .unique();
    if (existing) {
      await ctx.db.delete('discussionMessageReactions', existing._id);
      return null;
    }
    await ctx.db.insert('discussionMessageReactions', {
      discussionId: discussion._id,
      emoji: normalized,
      messageId,
      organizationId: workspace.organizationId,
      userId: workspace.userId
    });
    return null;
  }

  static async listReactions(ctx: QueryCtx, discussionId: Id<'discussions'>) {
    await DiscussionAccess.require(ctx, discussionId);
    const rows = await ctx.db
      .query('discussionMessageReactions')
      .withIndex('by_discussionId_and_messageId', (query) => query.eq('discussionId', discussionId))
      .take(500);
    return rows.map((row) => ({
      emoji: row.emoji,
      messageId: row.messageId,
      userId: row.userId
    }));
  }

  static async editMessage(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    agentMessageId: string,
    text: string
  ): Promise<null> {
    const { workspace } = await DiscussionAccess.require(ctx, discussionId);
    const receipt = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', agentMessageId)
      )
      .unique();
    if (!receipt || receipt.author.userId !== workspace.userId) {
      throw new ConvexError('You can only edit your own messages');
    }
    const content = Messages.normalizeContent(text, 'Message');
    await ctx.db.patch('discussionMessages', receipt._id, {
      content,
      editedAt: Date.now()
    });
    return null;
  }

  static async deleteMessage(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    agentMessageId: string
  ): Promise<null> {
    const { workspace } = await DiscussionAccess.require(ctx, discussionId);
    const receipt = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', agentMessageId)
      )
      .unique();
    if (!receipt || receipt.author.userId !== workspace.userId) {
      throw new ConvexError('You can only delete your own messages');
    }
    await ctx.db.patch('discussionMessages', receipt._id, {
      content: { format: 'plain_text', text: '' },
      deletedAt: Date.now()
    });
    return null;
  }
}
