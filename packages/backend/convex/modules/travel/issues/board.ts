import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { TripIssueStatus } from '#convex/modules/travel/issues/status';

export const MAX_ISSUES = 200;
/** Distance between neighbors when ranks are assigned sequentially or appended. */
export const RANK_STEP = 1024;
/** Below this gap between neighbors a lane is renumbered before inserting between them. */
export const MIN_RANK_GAP = 1e-3;

/** Board order of a row. */
export function rankOf(issue: Doc<'tripIssues'>): number {
  return issue.boardRank;
}

/** Board order: by rank, ties broken by creation time so equal ranks never reshuffle. */
export function compareByRank(left: Doc<'tripIssues'>, right: Doc<'tripIssues'>): number {
  return rankOf(left) - rankOf(right) || left._creationTime - right._creationTime;
}

/** Every issue of a trip, bounded by the per-trip cap. */
export async function issuesOf(
  ctx: Pick<QueryCtx, 'db'>,
  tripId: Id<'trips'>
): Promise<Array<Doc<'tripIssues'>>> {
  const issues = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
    .take(MAX_ISSUES + 1);
  if (issues.length > MAX_ISSUES) throw new ConvexError(`Trips support up to ${MAX_ISSUES} issues`);
  return issues;
}

/** The issues of one lane, in board order. */
export function laneIn(
  issues: Array<Doc<'tripIssues'>>,
  status: TripIssueStatus
): Array<Doc<'tripIssues'>> {
  return issues.filter((issue) => issue.status === status).toSorted(compareByRank);
}

/** The rank that puts a card below everything in `lane`. */
export function bottomRank(lane: Array<Doc<'tripIssues'>>): number {
  const last = lane.at(-1);
  return last ? rankOf(last) + RANK_STEP : RANK_STEP;
}

/** Every issue in one lane of a trip, in board order. */
export async function laneOf(
  ctx: Pick<QueryCtx, 'db'>,
  tripId: Id<'trips'>,
  status: TripIssueStatus
): Promise<Array<Doc<'tripIssues'>>> {
  return laneIn(await issuesOf(ctx, tripId), status);
}

/** Where a dropped card goes: the card directly above and/or directly below it in the lane. */
export type Placement = { above?: Id<'tripIssues'>; below?: Id<'tripIssues'> };

/**
 * Where to put a card in `lane` (the target lane without it): directly below `above`, else
 * directly above `below`, else at the bottom. `above` wins when both are given, so a slightly
 * stale drop still lands next to a card the user saw.
 */
export function insertionIndex(lane: Array<Doc<'tripIssues'>>, placement: Placement): number {
  const indexOf = (id: Id<'tripIssues'> | undefined) =>
    id === undefined ? -1 : lane.findIndex((candidate) => candidate._id === id);
  const above = indexOf(placement.above);
  if (above !== -1) return above + 1;
  const below = indexOf(placement.below);
  return below === -1 ? lane.length : below;
}

/** Neighbors must be issues of the same trip; ones that merely changed lanes are tolerated. */
export async function assertNeighborsOnTrip(
  ctx: Pick<MutationCtx, 'db'>,
  issue: Doc<'tripIssues'>,
  placement: Placement
): Promise<void> {
  const ids = [placement.above, placement.below].filter((id) => id !== undefined);
  if (ids.includes(issue._id)) throw new ConvexError('An issue cannot be placed next to itself');
  const neighbors = await Promise.all(ids.map((id) => ctx.db.get('tripIssues', id)));
  if (neighbors.some((neighbor) => neighbor?.tripId !== issue.tripId)) {
    throw new ConvexError('Neighbor issue is not on this trip');
  }
}

/** Rank for a card dropped at `index`; renumbers the lane first if the gap is too small. */
export async function rankAt(
  ctx: Pick<MutationCtx, 'db'>,
  issue: Doc<'tripIssues'>,
  lane: Array<Doc<'tripIssues'>>,
  index: number
): Promise<number> {
  const above = lane[index - 1];
  const below = lane[index];
  if (!above) return below ? rankOf(below) - RANK_STEP : RANK_STEP;
  if (!below) return rankOf(above) + RANK_STEP;
  const gap = rankOf(below) - rankOf(above);
  if (gap >= MIN_RANK_GAP) return rankOf(above) + gap / 2;
  // Neighbors are too close (or tied): renumber the lane with the dropped card in place.
  const ordered = [...lane.slice(0, index), issue, ...lane.slice(index)];
  await Promise.all(
    ordered.flatMap((entry, position) =>
      entry._id === issue._id
        ? []
        : [ctx.db.patch('tripIssues', entry._id, { boardRank: (position + 1) * RANK_STEP })]
    )
  );
  return (index + 1) * RANK_STEP;
}
