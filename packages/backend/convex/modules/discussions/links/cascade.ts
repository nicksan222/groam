import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import type { DiscussionLinkTarget } from '#convex/modules/discussions/links/schema';

const BATCH = 100;

/** "issue:<id>" | "idea:<id>" | "<destination|activity|stay>:<id>". Stable dedupe and reverse-lookup key. */
export function linkTargetKey(target: DiscussionLinkTarget): string {
  if (target.kind === 'issue') return `issue:${target.issueId}`;
  if (target.kind === 'idea') return `idea:${target.proposalId}`;
  return `${target.target.type}:${target.target.id}`;
}

/**
 * Called wherever an issue, idea, or itinerary item is deleted so no link dangles. A target is
 * linked from at most one research per research slot of its trip, so the loop stays short.
 */
export async function removeLinksForTargetKey(ctx: MutationCtx, targetKey: string): Promise<void> {
  for (;;) {
    const rows = await ctx.db
      .query('discussionLinks')
      .withIndex('by_targetKey', (query) => query.eq('targetKey', targetKey))
      .take(BATCH);
    await Promise.all(rows.map((row) => ctx.db.delete('discussionLinks', row._id)));
    const removedPerDiscussion = new Map<Id<'discussions'>, number>();
    for (const row of rows) {
      removedPerDiscussion.set(
        row.discussionId,
        (removedPerDiscussion.get(row.discussionId) ?? 0) + 1
      );
    }
    await Promise.all(
      [...removedPerDiscussion].map(async ([discussionId, removed]) => {
        const discussion = await ctx.db.get('discussions', discussionId);
        if (discussion?.kind !== 'research') return;
        await ctx.db.patch('discussions', discussionId, {
          linkCount: Math.max(0, discussion.linkCount - removed)
        });
      })
    );
    if (rows.length < BATCH) return;
  }
}

/** One batch of a research's links. True when more may remain. */
export async function removeLinksForDiscussion(
  ctx: MutationCtx,
  discussionId: Id<'discussions'>,
  batchSize: number
): Promise<boolean> {
  const rows = await ctx.db
    .query('discussionLinks')
    .withIndex('by_discussionId', (query) => query.eq('discussionId', discussionId))
    .take(batchSize);
  await Promise.all(rows.map((row) => ctx.db.delete('discussionLinks', row._id)));
  return rows.length > 0;
}

/** One batch of every link in a trip (covers targets that vanish with the trip). */
export async function removeLinksForTrip(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  batchSize: number
): Promise<boolean> {
  const rows = await ctx.db
    .query('discussionLinks')
    .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
    .take(batchSize);
  await Promise.all(rows.map((row) => ctx.db.delete('discussionLinks', row._id)));
  return rows.length > 0;
}
