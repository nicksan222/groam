import { ConvexError } from 'convex/values';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';
import type { ParsedVersionSnapshot } from '#convex/modules/travel/versions/snapshot/types';
import type { Doc, Id } from '#convex-generated/dataModel';

/** Reconciles the packing files produced by the standard idea merge or rebase. */
export async function applyPackingSnapshot(
  ctx: MutableTripCtx,
  items: ParsedVersionSnapshot['packingItems'],
  existingRows: Doc<'tripPackingItems'>[],
  retainSourceKeys = false
) {
  const existingByKey = new Map(
    existingRows.map((item) => [String(item.sourceId ?? item._id), item])
  );
  const retained = new Set<Id<'tripPackingItems'>>();
  await Promise.all(
    items.map(async ({ key, value }) => {
      const existing = existingByKey.get(key);
      const sourceId = retainSourceKeys ? ctx.db.normalizeId('tripPackingItems', key) : undefined;
      if (sourceId === null) throw new ConvexError('Invalid packing item reference');
      const fields = { ...value, sourceId };
      if (existing) {
        retained.add(existing._id);
        if (
          existing.label !== value.label ||
          existing.packed !== value.packed ||
          existing.sortOrder !== value.sortOrder ||
          existing.sourceId !== sourceId
        ) {
          await ctx.db.patch('tripPackingItems', existing._id, {
            ...fields,
            updatedAt: Date.now()
          });
        }
      } else {
        const id = await ctx.db.insert('tripPackingItems', {
          ...fields,
          organizationId: ctx.workspace.organizationId,
          tripId: ctx.trip._id,
          updatedAt: Date.now()
        });
        retained.add(id);
      }
    })
  );
  await Promise.all(
    existingRows.map(async (item) => {
      if (!retained.has(item._id)) await ctx.db.delete('tripPackingItems', item._id);
    })
  );
}
