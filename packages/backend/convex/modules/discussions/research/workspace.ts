import type { PaginationOptions } from 'convex/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const WORKSPACE_LIMIT = 8;
/** Rows scanned before filtering out removed researches and hidden trips. */
const WORKSPACE_SCAN = 40;

/** Recent research across every trip the viewer can see, newest activity first. */
export async function listForWorkspace(ctx: QueryCtx, workspace: Workspace) {
  const rows = await ctx.db
    .query('discussions')
    .withIndex('by_organizationId_and_kind_and_updatedAt', (query) =>
      query.eq('organizationId', workspace.organizationId).eq('kind', 'research')
    )
    .order('desc')
    .take(WORKSPACE_SCAN);
  return (await presentWorkspaceRows(ctx, workspace, rows)).slice(0, WORKSPACE_LIMIT);
}

/** Candidate pagination preserves progress through hidden and deleting researches. */
export async function pageForWorkspace(
  ctx: QueryCtx,
  workspace: Workspace,
  paginationOpts: PaginationOptions
) {
  if (
    !Number.isInteger(paginationOpts.numItems) ||
    paginationOpts.numItems < 1 ||
    paginationOpts.numItems > WORKSPACE_SCAN
  )
    throw new ConvexError(`Research page size must be between 1 and ${WORKSPACE_SCAN}`);
  const result = await ctx.db
    .query('discussions')
    .withIndex('by_organizationId_and_kind_and_updatedAt', (q) =>
      q.eq('organizationId', workspace.organizationId).eq('kind', 'research')
    )
    .order('desc')
    .paginate({ ...paginationOpts, maximumRowsRead: WORKSPACE_SCAN });
  return { ...result, page: await presentWorkspaceRows(ctx, workspace, result.page) };
}

async function presentWorkspaceRows(
  ctx: QueryCtx,
  workspace: Workspace,
  rows: Doc<'discussions'>[]
) {
  const trips = new Map<Id<'trips'>, Promise<Doc<'trips'> | null>>();
  const tripOf = (tripId: Id<'trips'>) => {
    let trip = trips.get(tripId);
    if (!trip) {
      trip = findVisibleTrip(ctx, tripId, workspace);
      trips.set(tripId, trip);
    }
    return trip;
  };
  const items = await Promise.all(
    rows.map(async (row) => {
      if (row.kind !== 'research' || row.deletingAt !== undefined) return null;
      const trip = await tripOf(row.tripId);
      if (!trip) return null;
      const mine = await ctx.db
        .query('discussionMembers')
        .withIndex('by_discussionId_and_userId', (query) =>
          query.eq('discussionId', row._id).eq('userId', workspace.userId)
        )
        .unique();
      return {
        id: row._id,
        lastActivityAt: row.updatedAt,
        lastMessage: row.lastMessage ?? null,
        shortId: row.shortId,
        title: row.title,
        tripId: trip._id,
        tripName: trip.name,
        unread:
          mine?.lastReadAt === undefined
            ? row.lastMessage !== undefined
            : mine.lastReadAt < row.updatedAt
      };
    })
  );
  return items.filter((item) => item !== null);
}
