import { createThread } from '@convex-dev/agent';
import {
  assistantChatDefaultTitle,
  assistantThreadSummary,
  parseAssistantThreadSummary
} from '@groam/ai-contracts/agents/registry';
import {
  type AssistantScreen,
  assistantConversationContextKey
} from '@groam/ai-contracts/agents/screen';
import { ConvexError } from 'convex/values';
import type { AssistantChat } from '#convex/modules/assistant/model/index';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { components, internal } from '#convex-generated/api';
import type { ActionCtx, QueryCtx } from '#convex-generated/server';

const MAX_CHAT_TITLE_LENGTH = 80;

function chatScreenContext(screenContext: string | undefined) {
  if (!screenContext) return null;
  try {
    const parsed = JSON.parse(screenContext) as Partial<AssistantScreen>;
    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.title !== 'string' ||
      !parsed.target ||
      (parsed.target.kind !== 'workspace' && parsed.target.kind !== 'trip')
    ) {
      return null;
    }
    return {
      contextKey: assistantConversationContextKey(parsed as AssistantScreen),
      contextTitle: parsed.title
    };
  } catch {
    return null;
  }
}

/** Private assistant threads owned by the signed-in workspace member. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantChats {
  static async list(ctx: QueryCtx): Promise<AssistantChat[]> {
    const workspace = await requireWorkspace(ctx);
    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      order: 'desc',
      paginationOpts: { cursor: null, numItems: 100 },
      userId: workspace.tokenIdentifier
    });
    return threads.page
      .flatMap((thread) => {
        const summary = parseAssistantThreadSummary(thread.summary);
        const context = chatScreenContext(summary?.screenContext);
        return summary?.organizationId === workspace.organizationId
          ? [
              {
                contextKey: context?.contextKey ?? null,
                contextTitle: context?.contextTitle ?? null,
                createdAt: thread._creationTime,
                id: thread._id,
                status: thread.status,
                tags: summary.tags,
                title: thread.title ?? 'Untitled AI chat',
                updatedAt: summary.updatedAt ?? thread._creationTime
              }
            ]
          : [];
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  static async create(
    ctx: ActionCtx,
    screen?: AssistantScreen,
    title = assistantChatDefaultTitle
  ): Promise<string> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || normalizedTitle.length > MAX_CHAT_TITLE_LENGTH) {
      throw new ConvexError(`AI chat titles must contain 1 to ${MAX_CHAT_TITLE_LENGTH} characters`);
    }
    const access = await ctx.runQuery(internal.modules.assistant.model.index.access, {});
    return await createThread(ctx, components.agent, {
      summary: assistantThreadSummary(
        access.organizationId,
        [],
        Date.now(),
        screen ? JSON.stringify(screen) : undefined
      ),
      title: normalizedTitle,
      userId: access.userId
    });
  }
}
