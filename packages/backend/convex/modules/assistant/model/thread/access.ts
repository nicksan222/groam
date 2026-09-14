import { getThreadMetadata } from '@convex-dev/agent';
import {
  type AssistantContextTag,
  parseAssistantThreadSummary
} from '@groam/ai-contracts/agents/registry';
import { ConvexError } from 'convex/values';
import type { ConversationScope } from '#convex/modules/assistant/model/schema';
import { type AuthContext, requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { components } from '#convex-generated/api';

/** Membership gate for private chats and discussion-backed assistant threads. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantThreads {
  static async require(
    ctx: AuthContext,
    threadId: string,
    scope: ConversationScope
  ): Promise<{
    tags: AssistantContextTag[];
    thread: Awaited<ReturnType<typeof getThreadMetadata>>;
    workspace: Workspace;
  }> {
    const workspace = await requireWorkspace(ctx);
    const thread = await getThreadMetadata(ctx, components.agent, { threadId });
    const summary = parseAssistantThreadSummary(thread.summary);
    if (summary?.organizationId !== workspace.organizationId) {
      throw new ConvexError('Assistant conversation not found');
    }
    if (scope === 'private') {
      if (thread.userId !== workspace.tokenIdentifier) {
        throw new ConvexError('Assistant conversation not found');
      }
    } else {
      if (thread.userId !== undefined) throw new ConvexError('Discussion not found');
      await Discussions.requireThread(ctx, threadId, workspace);
    }
    return { tags: summary.tags, thread, workspace };
  }
}
