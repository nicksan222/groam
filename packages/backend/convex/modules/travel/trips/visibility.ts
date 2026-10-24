/**
 * Trip visibility and group size, a leaf: readers outside the trip write path (agent wait
 * conditions, polls, discussions) import it without pulling in `ctx.ts` and its issue sync.
 */
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { canParticipateInTrip } from '#convex/modules/payments/index';

export const MAX_GROUP_MEMBERS = 100;

/**
 * The visibility rule every trip reader shares: a trip is visible to members of its
 * organization. Returns null when the trip is missing or belongs to another group.
 */
export async function findVisibleTrip(
  ctx: MutationCtx | QueryCtx,
  tripId: Id<'trips'>,
  workspace: Workspace
): Promise<Doc<'trips'> | null> {
  const data = await ctx.db.get('trips', tripId);
  return data && data.organizationId === workspace.organizationId ? data : null;
}

/**
 * A visible trip the viewer also holds a seat on (ideas resolve to their source trip). Anything
 * that shows a paid trip's content gates on this; null reads as not found.
 */
export async function findSeatedTrip(
  ctx: MutationCtx | QueryCtx,
  tripId: Id<'trips'>,
  workspace: Workspace
): Promise<Doc<'trips'> | null> {
  const data = await findVisibleTrip(ctx, tripId, workspace);
  return data && (await canParticipateInTrip(ctx, data, workspace.userId)) ? data : null;
}

/**
 * `findSeatedTrip` memoized per trip, for loops over rows that share trips (runs, polls): each
 * trip's visibility and seat are read once per call, not once per row.
 */
export function seatedTripLoader(ctx: MutationCtx | QueryCtx, workspace: Workspace) {
  const trips = new Map<Id<'trips'>, Promise<Doc<'trips'> | null>>();
  return (tripId: Id<'trips'>): Promise<Doc<'trips'> | null> => {
    let trip = trips.get(tripId);
    if (!trip) {
      trip = findSeatedTrip(ctx, tripId, workspace);
      trips.set(tripId, trip);
    }
    return trip;
  };
}

export type SeatedTripLoader = ReturnType<typeof seatedTripLoader>;
