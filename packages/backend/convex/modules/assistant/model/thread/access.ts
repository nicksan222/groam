import { getThreadMetadata } from '@convex-dev/agent';
import type { AssistantContextTag } from '@groam/ai/runtime/context-tag';
import { parseAssistantThreadSummary } from '@groam/ai/runtime/thread-summary';
import { ConvexError } from 'convex/values';
import { components } from '#convex-generated/api';
import type { ConversationScope } from '#convex/modules/assistant/model/schema';
import { type AuthContext, requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import type { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { Discussions } from '#convex/modules/discussions/threads/index';

/** Membership gate for private chats and discussion-backed assistant threads. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AssistantThreads {
  static async require(
    ctx: AuthContext,
    threadId: string,
    scope: ConversationScope
  ): Promise<{
    /** The discussion behind a discussion-backed thread; null for personal chats. */
    access: DiscussionAccess | null;
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
    // A discussion row owns the thread: its kind decides the scope and who may enter.
    const discussion = await ctx.db
      .query('discussions')
      .withIndex('by_threadId', (query) => query.eq('threadId', threadId))
      .unique();
    if (discussion) {
      const expected = kindPolicy(discussion.kind).audience === 'owner' ? 'private' : 'discussion';
      if (scope !== expected) throw new ConvexError('Discussion not found');
      const access = await Discussions.requireThread(ctx, threadId, workspace);
      return { access, tags: summary.tags, thread, workspace };
    }
    // Personal chats not yet moved onto discussions (phase 2 removes this path).
    if (scope === 'private') {
      if (thread.userId !== workspace.tokenIdentifier) {
        throw new ConvexError('Assistant conversation not found');
      }
    } else {
      if (thread.userId !== undefined) throw new ConvexError('Discussion not found');
      await Discussions.requireThread(ctx, threadId, workspace);
    }
    return { access: null, tags: summary.tags, thread, workspace };
  }
}
