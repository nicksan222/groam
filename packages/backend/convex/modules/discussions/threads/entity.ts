import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { requireWorkspace, type Workspace } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import { MAX_MESSAGES_PAGE_SIZE } from '#convex/modules/discussions/threads/limits';
import { roleFor } from '#convex/modules/travel/trips/access';
import type { TripRole } from '#convex/modules/travel/trips/ctx';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

export type DiscussionCtx = MutationCtx | QueryCtx;

/**
 * A discussion the current workspace member is allowed to see.
 * Load through `require` / `requireThread` / `requireMessages` — never construct it yourself.
 */
export class DiscussionAccess {
  private constructor(
    readonly discussion: Doc<'discussions'>,
    readonly workspace: Workspace,
    /** The discussion's trip when its audience is the trip; null otherwise. */
    readonly trip: Doc<'trips'> | null = null
  ) {}

  /** The caller's role on the trip behind a `trip`-audience discussion. */
  get tripRole(): TripRole | null {
    return this.trip
      ? roleFor(this.trip, this.workspace.userId, this.workspace.organizationRole)
      : null;
  }

  /**
   * Rename, edit the brief, delete. `members` audience: any participant (today's rule).
   * Otherwise the creator, plus trip organizers when the audience is the trip.
   */
  get canManage(): boolean {
    const policy = kindPolicy(this.discussion.kind);
    if (policy.audience === 'members') return true;
    if (this.discussion.createdBy.userId === this.workspace.userId) return true;
    return policy.audience === 'trip' && this.tripRole === 'organizer';
  }

  /** Writes to a conversation on an archived trip are refused. Reading still works. */
  assertWritable(): void {
    if (this.trip?.archive !== undefined) throw new ConvexError('This trip is archived');
  }

  /** Throws unless `canManage`. The caller can already see the discussion, so this does not leak. */
  assertCanManage(): void {
    if (!this.canManage) throw new ConvexError('Only the creator or a trip organizer can do this');
  }

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

  /**
   * Org match, then the kind's audience: a `discussionMembers` row (`members`), the creator
   * (`owner`), or anyone who can see the trip (`trip`). Any failure looks like "not found".
   */
  static async forWorkspace(
    ctx: DiscussionCtx,
    discussionId: Id<'discussions'>,
    workspace: Workspace
  ): Promise<DiscussionAccess> {
    return DiscussionAccess.loadForWorkspace(ctx, discussionId, workspace);
  }

  /** Routing metadata only: validate the audience without granting content/write access. */
  static async assertPreviewAudience(
    ctx: DiscussionCtx,
    discussionId: Id<'discussions'>,
    workspace: Workspace
  ): Promise<void> {
    await DiscussionAccess.loadForWorkspace(ctx, discussionId, workspace, true);
  }

  private static async loadForWorkspace(
    ctx: DiscussionCtx,
    discussionId: Id<'discussions'>,
    workspace: Workspace,
    allowUnpaid = false
  ): Promise<DiscussionAccess> {
    const discussion = await ctx.db.get('discussions', discussionId);
    if (!discussion || discussion.organizationId !== workspace.organizationId) {
      throw new ConvexError('Discussion not found');
    }
    // A research being removed is gone for everyone, even before its rows are purged.
    if ('deletingAt' in discussion && discussion.deletingAt !== undefined) {
      throw new ConvexError('Discussion not found');
    }
    const linkedTrip = await visibleLinkedTrip(ctx, discussion, workspace, allowUnpaid);
    const { audience } = kindPolicy(discussion.kind);
    if (audience === 'owner') {
      if (discussion.createdBy.userId !== workspace.userId) {
        throw new ConvexError('Discussion not found');
      }
      return new DiscussionAccess(discussion, workspace);
    }
    if (audience === 'trip') {
      if (!linkedTrip) throw new ConvexError('Discussion not found');
      return new DiscussionAccess(discussion, workspace, linkedTrip);
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

  /**
   * Stamp the caller as having seen the discussion. A `members` audience row already exists
   * (it is the access grant); a `trip` audience row is participation, created on first touch.
   */
  async markSeen(ctx: MutationCtx, at: number): Promise<void> {
    const membership = await ctx.db
      .query('discussionMembers')
      .withIndex('by_discussionId_and_userId', (query) =>
        query.eq('discussionId', this.discussion._id).eq('userId', this.workspace.userId)
      )
      .unique();
    if (membership) {
      await ctx.db.patch('discussionMembers', membership._id, { lastReadAt: at });
      return;
    }
    if (kindPolicy(this.discussion.kind).audience !== 'trip') return;
    await ctx.db.insert('discussionMembers', {
      discussionId: this.discussion._id,
      kind: this.discussion.kind,
      lastReadAt: at,
      organizationId: this.workspace.organizationId,
      userId: this.workspace.userId
    });
    const fresh = await ctx.db.get('discussions', this.discussion._id);
    if (fresh?.kind === 'research') {
      await ctx.db.patch('discussions', fresh._id, {
        participantCount: fresh.participantCount + 1
      });
    }
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

async function visibleLinkedTrip(
  ctx: DiscussionCtx,
  discussion: Doc<'discussions'>,
  workspace: Workspace,
  allowUnpaid: boolean
) {
  const tripId = 'tripId' in discussion ? discussion.tripId : undefined;
  if (!tripId) return null;
  const trip = await findVisibleTrip(ctx, tripId, workspace, { allowUnpaid });
  if (!trip) throw new ConvexError('Discussion not found');
  return trip;
}
