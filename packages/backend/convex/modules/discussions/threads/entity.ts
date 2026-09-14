import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { MAX_MESSAGES_PAGE_SIZE } from '#convex/modules/discussions/threads/limits';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export type DiscussionCtx = MutationCtx | QueryCtx;

/**
 * A discussion the current workspace member is allowed to see.
 * Load through `require` / `requireThread` / `requireMessages` — never construct it yourself.
 */
export class DiscussionAccess {
  private constructor(
    readonly discussion: Doc<'discussions'>,
    readonly workspace: Workspace
  ) {}

  /**
   * Message list pages are 1..MAX items. `allowEmptyPage` is for the realtime
   * stream subscription, which sends `numItems: 0` and only watches deltas.
   */
  static validatePagination(options: PaginationOptions, allowEmptyPage = false): void {
    if (
      !Number.isInteger(options.numItems) ||
      (options.numItems === 0 ? !allowEmptyPage : options.numItems < 1) ||
      options.numItems > MAX_MESSAGES_PAGE_SIZE
    ) {
      throw new ConvexError(`Message page size must be between 1 and ${MAX_MESSAGES_PAGE_SIZE}`);
    }
  }

  /** Org match plus a `discussionMembers` row for this user. Missing either looks like "not found". */
  static async forWorkspace(
    ctx: DiscussionCtx,
    discussionId: Id<'discussions'>,
    workspace: Workspace
  ): Promise<DiscussionAccess> {
    const discussion = await ctx.db.get('discussions', discussionId);
    if (!discussion || discussion.organizationId !== workspace.organizationId) {
      throw new ConvexError('Discussion not found');
    }
    const membership = await ctx.db
      .query('discussionMembers')
      .withIndex('by_discussionId_and_userId', (query) =>
        query.eq('discussionId', discussionId).eq('userId', workspace.userId)
      )
      .unique();
    if (!membership) throw new ConvexError('Discussion not found');
    return new DiscussionAccess(discussion, workspace);
  }

  static async require(
    ctx: DiscussionCtx,
    discussionId: Id<'discussions'>
  ): Promise<DiscussionAccess> {
    return await DiscussionAccess.forWorkspace(ctx, discussionId, await requireWorkspace(ctx));
  }

  /** Resolve the Agent thread id back to a discussion the caller belongs to. */
  static async requireThread(
    ctx: DiscussionCtx,
    threadId: string,
    workspace?: Workspace
  ): Promise<DiscussionAccess> {
    const authorizedWorkspace = workspace ?? (await requireWorkspace(ctx));
    const discussion = await ctx.db
      .query('discussions')
      .withIndex('by_threadId', (query) => query.eq('threadId', threadId))
      .unique();
    if (!discussion) throw new ConvexError('Discussion not found');
    return await DiscussionAccess.forWorkspace(ctx, discussion._id, authorizedWorkspace);
  }

  /** Same as `require`, plus the client’s thread id must still be this discussion’s thread. */
  static async requireMessages(
    ctx: DiscussionCtx,
    discussionId: Id<'discussions'>,
    threadId: string,
    paginationOpts: PaginationOptions
  ): Promise<DiscussionAccess> {
    DiscussionAccess.validatePagination(paginationOpts);
    const access = await DiscussionAccess.require(ctx, discussionId);
    if (access.discussion.threadId !== threadId) {
      throw new ConvexError('Discussion not found');
    }
    return access;
  }
}
