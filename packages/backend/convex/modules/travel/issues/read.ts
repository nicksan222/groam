import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import { MAX_ISSUES } from '#convex/modules/travel/issues/limits';

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
