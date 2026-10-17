import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';

const BATCH_SIZE = 100;

/**
 * One-off cleanup for the group-packing rework: deletes every `tripPackingItems` row written
 * before items had a `quantity` (the old checklist is intentionally dropped). Pages through the
 * table and reschedules itself until done. Run once per deployment after the schema push:
 * `convex run modules/travel/packing/cleanup:dropLegacyItems`.
 */
export const dropLegacyItems = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({ deleted: v.number(), done: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query('tripPackingItems')
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    const legacy = page.page.filter((row) => row.quantity === undefined);
    await Promise.all(legacy.map((row) => ctx.db.delete('tripPackingItems', row._id)));
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.modules.travel.packing.cleanup.dropLegacyItems, {
        cursor: page.continueCursor
      });
    }
    return { deleted: legacy.length, done: page.isDone };
  }
});
