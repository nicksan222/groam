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
  type AssistantAgentId,
  assistantAgents,
  isChatAgent,
  type ChatAgentId,
  isAssistantAgentId,
  mentionedAssistantAgent
} from '@groam/ai/agents';
import { assistantThreadSummary } from '@groam/ai/runtime/thread-summary';
import type { PaginationOptions } from 'convex/server';
import { ConvexError, type Infer } from 'convex/values';
import { components } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import type { AssistantScreen } from '#convex/modules/assistant/validators/index';
import { requireWorkspace, type Workspace, workspaceRoster } from '#convex/modules/auth/workspace';
import { kindPolicy, kindsForHome } from '#convex/modules/discussions/kinds/index';
import {
  removeLinksForDiscussion,
  removeLinksForTrip
} from '#convex/modules/discussions/links/cascade';
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
  MAX_MEMBERSHIP_ROWS,
  MAX_MESSAGE_ATTACHMENT_RECEIPTS,
  MAX_RESEARCH_TITLE_LENGTH,
  MAX_TITLE_LENGTH
} from '#convex/modules/discussions/threads/limits';
import type { DiscussionMember } from '#convex/modules/discussions/threads/schema';
import { PollCleanup } from '#convex/modules/polls/cleanup';
import { insertWithShortId } from '#convex/modules/references/index';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

export type { DiscussionMessageMedia } from '#convex/modules/discussions/media/index';
export type { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

const DEFAULT_DISCUSSION_AGENT: ChatAgentId = 'groam';
const DELETED_MESSAGE_TEXT = 'This message was deleted';
const ASSISTANT_FAILED_FALLBACK = 'Assistant response failed';
const EMPTY_REPLY_ERROR = 'Groam returned an empty reply';
/** A `responding` claim older than this is treated as a crashed action and can be reclaimed. */
export const ASSISTANT_CLAIM_STALE_MS = 10 * 60 * 1000;

export function isStaleClaim(claimedAt: number, now: number): boolean {
  return now - claimedAt >= ASSISTANT_CLAIM_STALE_MS;
}

/** Receipt-derived fields. A deleted message must never leak its original parts to members. */
function receiptFields(receipt: Doc<'discussionMessages'> | null) {
  return {
    ...(receipt?.deletedAt === undefined ? {} : { parts: [] }),
    ...(receipt?.assistantStatus ? { assistantStatus: receipt.assistantStatus } : {}),
    ...(receipt?.assistantStatus === 'failed'
      ? { assistantError: receipt.assistantError ?? ASSISTANT_FAILED_FALLBACK }
      : {})
  };
}

const assistantAuthor = { name: 'Groam', userId: 'groam-ai' };

/** Agent messages are saved under the agent id; show that agent's label, Groam when unknown. */
function assistantAuthorFor(agentName: string | undefined) {
  return agentName !== undefined && isAssistantAgentId(agentName)
    ? { ...assistantAuthor, name: assistantAgents[agentName].label }
    : assistantAuthor;
}

function messageContentForMedia(
  content: ReturnType<typeof Messages.normalizeContent>,
  media: Parameters<typeof DiscussionMedia.previewLabel>[0]
) {
  const agentPrompt = content.text.length > 0 ? content.text : DiscussionMedia.previewLabel(media);
  return {
    agentPrompt,
    storedContent:
      content.text.length > 0 ? content : { format: 'plain_text' as const, text: agentPrompt }
  };
}

export type DiscussionAssistantClaim = {
  agent: ChatAgentId;
  expectedUpdatedAt: number;
  prompt: string;
  runId: Id<'agentRuns'>;
  threadId: string;
};

/** Groam answers in `always` kinds; otherwise a request or an @mention picks the agent. */
function selectAssistantAgent(
  kind: Doc<'discussions'>['kind'],
  text: string,
  requested: ChatAgentId | undefined
): ChatAgentId | null {
  if (kind === 'research') return null;
  if (kindPolicy(kind).agentTrigger === 'always') return requested ?? DEFAULT_DISCUSSION_AGENT;
  return requested ?? mentionedAssistantAgent(text)?.id ?? null;
}

function titleLimitFor(kind: Doc<'discussions'>['kind']): number {
  return kindPolicy(kind).trip === 'required' ? MAX_RESEARCH_TITLE_LENGTH : MAX_TITLE_LENGTH;
}

export type DiscussionSendResult = {
  assistantAgent: ChatAgentId | null;
  messageId: string;
};

function sameMembers(left: DiscussionMember[], right: DiscussionMember[]): boolean {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right.map((member) => member.userId));
  return left.every((member) => rightIds.has(member.userId));
}

export function normalizeTitle(value: string, maximum = MAX_TITLE_LENGTH): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new ConvexError(`Discussion titles must contain 1 to ${maximum} characters`);
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
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
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
    const membersById = new Map(
      ('members' in discussion ? discussion.members : []).map((member) => [member.userId, member])
    );
    const receiptForMessage = async (message: (typeof messages.page)[number]) =>
      message.role === 'user'
        ? await ctx.db
            .query('discussionMessages')
            .withIndex('by_discussionId_and_agentMessageId', (query) =>
              query.eq('discussionId', args.discussionId).eq('agentMessageId', message.id)
            )
            .unique()
        : null;
    const attachmentsForReceipt = async (receipt: Awaited<ReturnType<typeof receiptForMessage>>) =>
      receipt
        ? await DiscussionMedia.load(
            ctx,
            discussion.organizationId,
            await DiscussionMedia.idsForReceipt(ctx, receipt)
          )
        : [];
    const displayTextFor = (
      message: (typeof messages.page)[number],
      receipt: Awaited<ReturnType<typeof receiptForMessage>>,
      attachments: Awaited<ReturnType<typeof attachmentsForReceipt>>
    ) => {
      if (receipt?.deletedAt) return DELETED_MESSAGE_TEXT;
      const receiptText = receipt?.content.text?.trim() ?? '';
      return message.role === 'user' && receipt
        ? displayUserMessageText(receiptText, message.text, attachments)
        : message.text;
    };
    const presentMessage = async (message: (typeof messages.page)[number]) => {
      const receipt = await receiptForMessage(message);
      const deleted = receipt?.deletedAt !== undefined;
      const attachments = deleted ? [] : await attachmentsForReceipt(receipt);
      const participant =
        (message.userId ? membersById.get(message.userId) : null) ?? receipt?.author;
      return {
        ...message,
        ...receiptFields(receipt),
        attachments,
        author:
          message.role === 'assistant'
            ? assistantAuthorFor(message.agentName)
            : (participant ?? {
                name: 'Former participant',
                userId: message.userId ?? 'former-participant'
              }),
        deleted,
        edited: receipt?.editedAt !== undefined,
        media: attachments,
        mine: message.role === 'user' && message.userId === workspace.userId,
        text: displayTextFor(message, receipt, attachments)
      };
    };
    const page = await Promise.all(messages.page.map(presentMessage));
    return { ...messages, page, streams };
  }

  static async create(
    ctx: MutationCtx,
    {
      title,
      memberUserIds,
      clientRequestId,
      tripId
    }: {
      title: string;
      memberUserIds: string[];
      clientRequestId: string;
      tripId?: Id<'trips'>;
    }
  ): Promise<Id<'discussions'>> {
    const workspace = await requireWorkspace(ctx);
    const normalizedTitle = normalizeTitle(title);
    const normalizedRequestId = Messages.normalizeRequestId(clientRequestId, 'Discussion');
    // A client-supplied trip id must belong to the caller's group.
    if (tripId) await loadTripContext(ctx, tripId, workspace);
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
      if (
        existing.kind !== 'group' ||
        existing.title !== normalizedTitle ||
        !sameMembers(existing.members, members)
      ) {
        throw new ConvexError('Discussion request id was already used');
      }
      return existing._id;
    }
    await discussionRateLimiter.limit(ctx, 'discussionCreate', {
      key: workspace.tokenIdentifier,
      throws: true
    });
    // Only group rows count toward the limit; research participation is unbounded by it.
    const membershipLists = await Promise.all(
      members.map((member) =>
        ctx.db
          .query('discussionMembers')
          .withIndex('by_organizationId_and_userId_and_kind', (query) =>
            query
              .eq('organizationId', workspace.organizationId)
              .eq('userId', member.userId)
              .eq('kind', 'group')
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
        kind: 'group' as const,
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
          kind: 'group',
          organizationId: workspace.organizationId,
          userId: member.userId
        })
      )
    );
    return discussionId;
  }

  static async list(ctx: QueryCtx) {
    const workspace = await requireWorkspace(ctx);
    // Read only the kinds listed in Chats; research participation rows never count here.
    const membershipLists = await Promise.all(
      kindsForHome('chats').map((kind) =>
        ctx.db
          .query('discussionMembers')
          .withIndex('by_organizationId_and_userId_and_kind', (query) =>
            query
              .eq('organizationId', workspace.organizationId)
              .eq('userId', workspace.userId)
              .eq('kind', kind)
          )
          .take(MAX_MEMBERSHIP_ROWS + 1)
      )
    );
    const memberships = membershipLists.flat();
    if (memberships.length > MAX_MEMBERSHIP_ROWS) {
      throw new ConvexError(`Discussion limit of ${MAX_MEMBERSHIP_ROWS} exceeded`);
    }
    // Multiple Chats rows may reference one trip; share its entitlement read within this query.
    const trips = new Map<Id<'trips'>, Promise<Doc<'trips'> | null>>();
    const visibleTrip = (tripId: Id<'trips'>) => {
      let trip = trips.get(tripId);
      if (!trip) {
        trip = findVisibleTrip(ctx, tripId, workspace);
        trips.set(tripId, trip);
      }
      return trip;
    };
    const discussions = await Promise.all(
      memberships.map(async (membership) => {
        const discussion = await ctx.db.get('discussions', membership.discussionId);
        if (!discussion || discussion.organizationId !== workspace.organizationId) return null;
        // The literal narrows to the variant that carries members and an optional trip.
        if (discussion.kind !== 'group') return null;
        const trip = discussion.tripId ? await visibleTrip(discussion.tripId) : null;
        if (discussion.tripId && !trip) return null;
        return {
          createdBy: discussion.createdBy,
          id: discussion._id,
          shortId: discussion.shortId,
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

  /** Group: any participant. Research: creator or trip organizer. Title changes do not bump unread. */
  static async rename(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    title: string
  ): Promise<null> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    const { discussion } = access;
    access.assertCanManage();
    access.assertWritable();
    const normalizedTitle = normalizeTitle(title, titleLimitFor(discussion.kind));
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
    {
      discussionId,
      text,
      clientRequestId,
      requestedAssistantAgent,
      mediaIds = []
    }: {
      discussionId: Id<'discussions'>;
      text: string;
      clientRequestId: string;
      requestedAssistantAgent?: ChatAgentId;
      mediaIds?: Id<'media'>[];
    }
  ): Promise<DiscussionSendResult> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    const { discussion, workspace } = access;
    access.assertWritable();
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
    const { agentPrompt, storedContent } = messageContentForMedia(normalizedContent, media);
    const normalizedRequestId = Messages.normalizeRequestId(clientRequestId, 'Message');
    const assistantAgent = selectAssistantAgent(
      discussion.kind,
      normalizedContent.text,
      requestedAssistantAgent
    );
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
        assistantAgent:
          existing.assistantAgent && isChatAgent(assistantAgents[existing.assistantAgent])
            ? (assistantAgents[existing.assistantAgent].id as ChatAgentId)
            : null,
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
    const sentAt = Date.now();
    await ctx.db.patch('discussions', discussion._id, {
      lastMessage: {
        authorName: workspace.viewerName,
        text: storedContent.text.slice(0, 160)
      },
      updatedAt: sentAt
    });
    // The sender has seen their own message; do not flag the chat unread for them.
    await access.markSeen(ctx, sentAt);
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
    promptMessageId: string,
    screen: AssistantScreen
  ): Promise<DiscussionAssistantClaim | null> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    access.assertWritable();
    const { discussion, workspace } = access;
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
    const agent = assistantAgents[request.assistantAgent];
    if (!isChatAgent(agent) || discussion.kind === 'research')
      throw new ConvexError('Research uses topic-based runs');
    if (
      request.assistantStatus === 'complete' ||
      (request.assistantStatus === 'responding' &&
        request.assistantClaimedAt !== undefined &&
        !isStaleClaim(request.assistantClaimedAt, Date.now()))
    ) {
      return null;
    }
    await ctx.db.patch('discussionMessages', request._id, {
      assistantClaimedAt: Date.now(),
      assistantError: undefined,
      assistantStatus: 'responding'
    });
    const runId = await AgentRuns.claimDiscussionTurn(ctx, {
      actorTokenIdentifier: workspace.tokenIdentifier,
      agentId: request.assistantAgent,
      createdBy: { name: workspace.viewerName, userId: workspace.userId },
      discussionId,
      discussionUpdatedAt: discussion.updatedAt,
      organizationId: workspace.organizationId,
      promptMessageId,
      screen,
      threadId: discussion.threadId,
      title: discussion.title
    });
    return {
      agent: agent.id,
      expectedUpdatedAt: discussion.updatedAt,
      prompt: request.content.text,
      runId,
      threadId: discussion.threadId
    };
  }

  /** Persist success/failure. Skips the last-message preview if the thread moved on. */
  static async finishAssistantResponse(
    ctx: MutationCtx,
    {
      discussionId,
      promptMessageId,
      expectedUpdatedAt,
      responseText,
      runId,
      error,
      finishRun = true
    }: {
      discussionId: Id<'discussions'>;
      promptMessageId: string;
      expectedUpdatedAt: number;
      responseText: string | null;
      runId: Id<'agentRuns'>;
      error?: string;
      /** False when the run suspends on a wait: the request completes, the run lives on. */
      finishRun?: boolean;
    }
  ): Promise<void> {
    // Runs from the workflow's onComplete (no identity); every caller is internal.
    const discussion = await ctx.db.get('discussions', discussionId);
    if (!discussion) return;
    const request = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', promptMessageId)
      )
      .unique();
    if (!request?.assistantAgent || request.assistantStatus !== 'responding') return;
    const blank = responseText?.trim().length === 0;
    const failed = responseText === null || blank;
    const failure = error ?? (blank ? EMPTY_REPLY_ERROR : ASSISTANT_FAILED_FALLBACK);
    await ctx.db.patch('discussionMessages', request._id, {
      assistantError: failed ? failure.slice(0, 300) : undefined,
      assistantStatus: failed ? 'failed' : 'complete'
    });
    if (finishRun) {
      await AgentRuns.finish(ctx, {
        runId,
        status: failed ? 'failed' : 'complete',
        ...(failed ? { error: failure } : { report: responseText.trim() })
      });
    }
    if (failed || discussion.updatedAt !== expectedUpdatedAt) return;
    await ctx.db.patch('discussions', discussion._id, {
      lastMessage: {
        authorName: assistantAgents[request.assistantAgent].label,
        text: responseText.slice(0, 160)
      },
      updatedAt: Date.now()
    });
  }

  /**
   * A resumed run's reply has no discussion request to finish; it still becomes the chat's last
   * message unless someone posted after the turn started.
   */
  static async recordAssistantReply(
    ctx: MutationCtx,
    {
      agentId,
      discussionId,
      expectedUpdatedAt,
      text
    }: {
      agentId: AssistantAgentId;
      discussionId: Id<'discussions'>;
      expectedUpdatedAt: number;
      text: string;
    }
  ): Promise<void> {
    const discussion = await ctx.db.get('discussions', discussionId);
    const reply = text.trim();
    if (!discussion || !reply || discussion.updatedAt !== expectedUpdatedAt) return;
    await ctx.db.patch('discussions', discussion._id, {
      lastMessage: { authorName: assistantAgents[agentId].label, text: reply.slice(0, 160) },
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

  /**
   * Remove one batch of a discussion's dependents (messages, reactions, participation, links),
   * then its Agent thread and row once nothing is left. True while more work remains.
   */
  static async purge(
    ctx: MutationCtx,
    discussion: Doc<'discussions'>,
    batchSize: number
  ): Promise<boolean> {
    // Runs still in the chat (a waiting one would resume into a deleted thread) stop first.
    await AgentRuns.abortAllForDiscussion(ctx, discussion._id);
    if (await PollCleanup.purgeForDiscussion(ctx, discussion._id, batchSize)) return true;
    const messages = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId', (query) => query.eq('discussionId', discussion._id))
      .take(batchSize);
    if (messages.length > 0) {
      await Promise.all(
        messages.map(async (message) => {
          await DiscussionMedia.deleteRefs(ctx, message._id);
          await ctx.db.delete('discussionMessages', message._id);
        })
      );
      return true;
    }
    const reactions = await ctx.db
      .query('discussionMessageReactions')
      .withIndex('by_discussionId_and_messageId', (query) =>
        query.eq('discussionId', discussion._id)
      )
      .take(batchSize);
    if (reactions.length > 0) {
      await Promise.all(
        reactions.map((row) => ctx.db.delete('discussionMessageReactions', row._id))
      );
      return true;
    }
    const members = await ctx.db
      .query('discussionMembers')
      .withIndex('by_discussionId', (query) => query.eq('discussionId', discussion._id))
      .take(batchSize);
    if (members.length > 0) {
      await Promise.all(members.map((row) => ctx.db.delete('discussionMembers', row._id)));
      return true;
    }
    if (await removeLinksForDiscussion(ctx, discussion._id, batchSize)) return true;
    if (discussion.threadId) {
      await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
        limit: batchSize,
        threadId: discussion.threadId
      });
    }
    await ctx.db.delete('discussions', discussion._id);
    return false;
  }

  /** One step of removing a trip's research conversations and links. True while work remains. */
  static async purgeForTrip(
    ctx: MutationCtx,
    tripId: Id<'trips'>,
    batchSize: number
  ): Promise<boolean> {
    for (const kind of kindsForHome('trip')) {
      const conversation = await ctx.db
        .query('discussions')
        .withIndex('by_tripId_and_kind_and_updatedAt', (query) =>
          query.eq('tripId', tripId).eq('kind', kind)
        )
        .first();
      if (!conversation) continue;
      // The literal narrows to the variant that can be marked as being removed.
      if (conversation.kind === 'research' && conversation.deletingAt === undefined) {
        await ctx.db.patch('discussions', conversation._id, { deletingAt: Date.now() });
      }
      await Discussions.purge(ctx, conversation, batchSize);
      return true;
    }
    return await removeLinksForTrip(ctx, tripId, batchSize);
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
        if (discussion?.organizationId === organizationId && discussion.kind === 'group') {
          await ctx.db.patch('discussions', discussion._id, {
            members: discussion.members.filter((member) => member.userId !== userId)
          });
        }
        if (discussion?.organizationId === organizationId && discussion.kind === 'research') {
          await ctx.db.patch('discussions', discussion._id, {
            participantCount: Math.max(0, discussion.participantCount - 1)
          });
        }
        await ctx.db.delete(membership._id);
      })
    );
    return memberships.length === batchSize;
  }

  static async markRead(ctx: MutationCtx, discussionId: Id<'discussions'>): Promise<null> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    await access.markSeen(ctx, Date.now());
    return null;
  }

  static async toggleReaction(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    messageId: string,
    emoji: string
  ): Promise<null> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    const { discussion, workspace } = access;
    access.assertWritable();
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
    const access = await DiscussionAccess.require(ctx, discussionId);
    const { workspace } = access;
    access.assertWritable();
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
    const access = await DiscussionAccess.require(ctx, discussionId);
    const { workspace } = access;
    access.assertWritable();
    const receipt = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', agentMessageId)
      )
      .unique();
    if (!receipt || receipt.author.userId !== workspace.userId) {
      throw new ConvexError('You can only delete your own messages');
    }
    if (receipt.deletedAt !== undefined) return null;
    await ctx.db.patch('discussionMessages', receipt._id, {
      content: { format: 'plain_text', text: '' },
      deletedAt: Date.now(),
      mediaIds: undefined
    });
    await DiscussionMedia.deleteRefs(ctx, receipt._id);
    // Scrub the stored Agent message so the original text never reaches later AI turns.
    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId: agentMessageId as never,
      patch: { message: { content: DELETED_MESSAGE_TEXT, role: 'user' } }
    });
    return null;
  }
}
