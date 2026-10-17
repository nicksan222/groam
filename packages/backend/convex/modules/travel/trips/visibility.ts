/**
 * Trip visibility and group size, a leaf: readers outside the trip write path (agent wait
 * conditions, polls, discussions) import it without pulling in `ctx.ts` and its issue sync.
 */
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';

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
