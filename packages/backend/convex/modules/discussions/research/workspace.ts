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
  return items.filter((item) => item !== null).slice(0, WORKSPACE_LIMIT);
}
