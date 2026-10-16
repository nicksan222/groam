import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { TripIssueStatus } from '#convex/modules/travel/issues/status';

export const MAX_ISSUES = 200;
/** Distance between neighbors when ranks are assigned sequentially or appended. */
export const RANK_STEP = 1024;
/** Below this gap between neighbors a lane is renumbered before inserting between them. */
export const MIN_RANK_GAP = 1e-3;

/** Board order of a row; legacy rows without `boardRank` order by creation time. */
export function rankOf(issue: Doc<'tripIssues'>): number {
  return issue.boardRank ?? issue._creationTime;
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
