import { listMessages, saveMessages } from '@convex-dev/agent';
import { type ChatAgentId, assistantAgents } from '@groam/ai/agents';
import type { ResearchInstructionContext } from '@groam/ai/backend/instructions';
import { ConvexError } from 'convex/values';
import { components } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { Messages } from '#convex/modules/discussions/messages/index';
import { Research } from '#convex/modules/discussions/research/index';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';

const RECENT_MESSAGE_LIMIT = 30;
const MESSAGE_TEXT_LIMIT = 1_000;

/** What the assistant tools read and write on a research, always as the calling user. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class ResearchAssistant {
  /** Brief, links, and the last messages as plain text, oldest first. */
  static async read(ctx: QueryCtx, discussionId: Id<'discussions'>) {
    const research = await Research.get(ctx, discussionId);
    const recent = research.threadId
      ? await listMessages(ctx, components.agent, {
          excludeToolMessages: true,
          paginationOpts: { cursor: null, numItems: RECENT_MESSAGE_LIMIT },
          threadId: research.threadId
        })
      : null;
    const messages = await Promise.all(
      (recent?.page ?? []).flatMap((message) => {
        const text = message.text?.trim() ?? '';
        const role = message.message?.role;
        if (text.length === 0 || (role !== 'user' && role !== 'assistant')) return [];
        return [
          (async () => {
            const receipt =
              role === 'user'
                ? await ctx.db
                    .query('discussionMessages')
                    .withIndex('by_discussionId_and_agentMessageId', (query) =>
                      query.eq('discussionId', discussionId).eq('agentMessageId', message._id)
                    )
                    .unique()
                : null;
            if (receipt?.deletedAt !== undefined) return null;
            return {
              author:
                role === 'assistant'
                  ? (message.agentName ?? 'Groam')
                  : (receipt?.author.name ?? 'Participant'),
              order: message.order * 1_000 + message.stepOrder,
              text: text.slice(0, MESSAGE_TEXT_LIMIT)
            };
          })()
        ];
      })
    );
    return {
      brief: research.brief,
      id: research.id,
      links: research.links.map((link) => ({
        kind: link.kind,
        label: link.label,
        targetId:
          link.target.kind === 'tripTarget'
            ? link.target.target.id
            : link.target.kind === 'issue'
              ? link.target.issueId
              : link.target.proposalId
      })),
      messages: messages
        .filter((message): message is NonNullable<typeof message> => message !== null)
        .sort((left, right) => left.order - right.order)
        .map(({ author, text }) => ({ author, text })),
      title: research.title,
      tripId: research.tripId,
      writable: research.writable
    };
  }

  /**
   * Saves an assistant message into the research thread, attributed to the agent. It is the
   * same message shape an in-thread reply has, so it renders like one.
   */
  static async post(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    agentId: ChatAgentId,
    text: string
  ): Promise<{ messageId: string }> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    const { discussion } = access;
    if (discussion.kind !== 'research') throw new ConvexError('Only a research can be posted to');
    access.assertWritable();
    if (!discussion.threadId) throw new ConvexError('Discussion not found');
    const content = Messages.normalizeContent(text, 'Message');
    const { messages } = await saveMessages(ctx, components.agent, {
      agentName: agentId,
      messages: [{ content: content.text, role: 'assistant' }],
      threadId: discussion.threadId,
      userId: access.workspace.userId
    });
    const messageId = messages[messages.length - 1]?._id;
    if (!messageId) throw new ConvexError('Unable to save the research message');
    const at = Date.now();
    await ctx.db.patch('discussions', discussion._id, {
      lastMessage: {
        authorName: assistantAgents[agentId].label,
        text: content.text.slice(0, 160)
      },
      updatedAt: at
    });
    await access.markSeen(ctx, at);
    return { messageId };
  }

  /** Title, brief, and link labels for the prompt; null when the thread is not a research. */
  static async instructionContext(
    ctx: QueryCtx,
    threadId: string
  ): Promise<ResearchInstructionContext | null> {
    const { discussion } = await DiscussionAccess.requireThread(ctx, threadId);
    if (discussion.kind !== 'research') return null;
    const links = await DiscussionLinks.resolved(ctx, discussion._id);
    return {
      brief: discussion.brief ?? null,
      links: links.map(({ kind, label }) => ({ kind, label })),
      title: discussion.title
    };
  }
}
