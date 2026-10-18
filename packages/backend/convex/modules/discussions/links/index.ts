import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import { linkTargetKey } from '#convex/modules/discussions/links/cascade';
import type { DiscussionLinkTarget } from '#convex/modules/discussions/links/schema';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import {
  MAX_LINKS_PER_RESEARCH,
  MAX_RESEARCHES_PER_TRIP
} from '#convex/modules/discussions/threads/limits';
import { TripTargets } from '#convex/modules/travel/targets/index';

/** A target is linked from researches of one trip, so the trip's research cap bounds it. */
const MAX_REVERSE_LINKS = MAX_RESEARCHES_PER_TRIP;

export type Ctx = MutationCtx | QueryCtx;

/** The research's trip. Links only exist on kinds whose policy allows them. */
function linkableTripId(access: DiscussionAccess): Id<'trips'> {
  const { discussion } = access;
  if (!kindPolicy(discussion.kind).links || !('tripId' in discussion) || !discussion.tripId) {
    throw new ConvexError('This conversation cannot be linked');
  }
  return discussion.tripId;
}

async function assertTargetInTrip(
  ctx: Ctx,
  tripId: Id<'trips'>,
  target: DiscussionLinkTarget
): Promise<void> {
  if (target.kind === 'issue') {
    const issue = await ctx.db.get('tripIssues', target.issueId);
    if (!issue || issue.tripId !== tripId) throw new ConvexError('Issue not found in this trip');
    return;
  }
  if (target.kind === 'idea') {
    const proposal = await ctx.db.get('tripProposals', target.proposalId);
    if (!proposal || proposal.sourceTripId !== tripId) {
      throw new ConvexError('Idea not found in this trip');
    }
    return;
  }
  await TripTargets.assertInTrip(ctx, tripId, target.target);
}

type ResolvedLabel = {
  kind: 'issue' | 'idea' | 'destination' | 'activity' | 'stay';
  label: string;
  shortId: string | null;
};

async function resolveLabel(ctx: Ctx, target: DiscussionLinkTarget): Promise<ResolvedLabel | null> {
  if (target.kind === 'issue') {
    const issue = await ctx.db.get('tripIssues', target.issueId);
    return issue ? { kind: 'issue', label: issue.title, shortId: issue.shortId } : null;
  }
  if (target.kind === 'idea') {
    const proposal = await ctx.db.get('tripProposals', target.proposalId);
    return proposal ? { kind: 'idea', label: proposal.title, shortId: proposal.shortId } : null;
  }
  const { id, type } = target.target;
  if (type === 'destination') {
    const row = await ctx.db.get('tripDestinations', id);
    return row ? { kind: type, label: row.name, shortId: null } : null;
  }
  if (type === 'activity') {
    const row = await ctx.db.get('tripDestinationActivities', id);
    return row ? { kind: type, label: row.title, shortId: null } : null;
  }
  const row = await ctx.db.get('tripDestinationStays', id);
  return row ? { kind: type, label: row.title, shortId: null } : null;
}

/** Research ↔ issue / idea / itinerary item. Anyone who can see the research may link. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class DiscussionLinks {
  static async link(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    target: DiscussionLinkTarget
  ): Promise<Id<'discussionLinks'>> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    const tripId = linkableTripId(access);
    access.assertWritable();
    await assertTargetInTrip(ctx, tripId, target);
    const targetKey = linkTargetKey(target);
    const existing = await ctx.db
      .query('discussionLinks')
      .withIndex('by_discussionId_and_targetKey', (query) =>
        query.eq('discussionId', discussionId).eq('targetKey', targetKey)
      )
      .unique();
    if (existing) return existing._id;
    const research = await ctx.db.get('discussions', discussionId);
    if (research?.kind !== 'research') throw new ConvexError('This conversation cannot be linked');
    if (research.linkCount >= MAX_LINKS_PER_RESEARCH) {
      throw new ConvexError(`A research can have up to ${MAX_LINKS_PER_RESEARCH} links`);
    }
    await ctx.db.patch('discussions', discussionId, { linkCount: research.linkCount + 1 });
    return await ctx.db.insert('discussionLinks', {
      createdBy: { name: access.workspace.viewerName, userId: access.workspace.userId },
      discussionId,
      organizationId: access.workspace.organizationId,
      target,
      targetKey,
      tripId
    });
  }

  static async unlink(
    ctx: MutationCtx,
    discussionId: Id<'discussions'>,
    target: DiscussionLinkTarget
  ): Promise<null> {
    const access = await DiscussionAccess.require(ctx, discussionId);
    linkableTripId(access);
    access.assertWritable();
    const row = await ctx.db
      .query('discussionLinks')
      .withIndex('by_discussionId_and_targetKey', (query) =>
        query.eq('discussionId', discussionId).eq('targetKey', linkTargetKey(target))
      )
      .unique();
    if (!row) return null;
    await ctx.db.delete('discussionLinks', row._id);
    const research = await ctx.db.get('discussions', discussionId);
    if (research?.kind === 'research') {
      await ctx.db.patch('discussions', discussionId, {
        linkCount: Math.max(0, research.linkCount - 1)
      });
    }
    return null;
  }

  /** Links with display labels. Links whose target disappeared are dropped. */
  static async listForDiscussion(ctx: QueryCtx, discussionId: Id<'discussions'>) {
    await DiscussionAccess.require(ctx, discussionId);
    return await DiscussionLinks.resolved(ctx, discussionId);
  }

  static async resolved(ctx: Ctx, discussionId: Id<'discussions'>) {
    const rows = await ctx.db
      .query('discussionLinks')
      .withIndex('by_discussionId', (query) => query.eq('discussionId', discussionId))
      .take(MAX_LINKS_PER_RESEARCH);
    const resolved = await Promise.all(
      rows.map(async (row) => {
        const label = await resolveLabel(ctx, row.target);
        return label
          ? {
              createdAt: row._creationTime,
              createdByName: row.createdBy.name,
              id: row._id,
              ...label,
              target: row.target,
              targetKey: row.targetKey
            }
          : null;
      })
    );
    return resolved.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  /** Researches that point at a target, limited to the ones the caller can open. */
  static async listForTarget(ctx: QueryCtx, workspace: Workspace, target: DiscussionLinkTarget) {
    const rows = await ctx.db
      .query('discussionLinks')
      .withIndex('by_targetKey', (query) => query.eq('targetKey', linkTargetKey(target)))
      .take(MAX_REVERSE_LINKS);
    const found = await Promise.all(
      rows.map(async (row) => {
        if (row.organizationId !== workspace.organizationId) return null;
        try {
          const { discussion } = await DiscussionAccess.forWorkspace(
            ctx,
            row.discussionId,
            workspace
          );
          // The literal narrows to the research variant, which always has a trip.
          if (!kindPolicy(discussion.kind).links || discussion.kind !== 'research') return null;
          return {
            id: discussion._id,
            kind: discussion.kind,
            shortId: discussion.shortId,
            title: discussion.title,
            tripId: discussion.tripId,
            updatedAt: discussion.updatedAt
          };
        } catch (error) {
          // Not visible to this caller (or being removed): leave it out; anything else is a bug.
          if (error instanceof ConvexError && error.data === 'Discussion not found') return null;
          throw error;
        }
      })
    );
    return found
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }
}

export type ResearchDoc = Extract<Doc<'discussions'>, { kind: 'research' }>;
