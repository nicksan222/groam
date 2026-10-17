import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { PackingItemRow } from '#convex/modules/travel/packing/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';
import type { ParsedVersionSnapshot } from '#convex/modules/travel/versions/snapshot/types';

/** Reconciles the packing files produced by the standard idea merge or rebase. */
export async function applyPackingSnapshot(
  ctx: MutableTripCtx,
  snapshot: {
    bringers: ParsedVersionSnapshot['packingBringers'];
    items: ParsedVersionSnapshot['packingItems'];
  },
  existing: { bringers: Doc<'tripPackingBringers'>[]; items: PackingItemRow[] },
  retainSourceKeys = false
) {
  const existingByKey = new Map(
    existing.items.map((item) => [String(item.sourceId ?? item._id), item])
  );
  const itemIdByKey = new Map<string, Id<'tripPackingItems'>>();
  await Promise.all(
    snapshot.items.map(async ({ key, value }) => {
      const current = existingByKey.get(key);
      const sourceId = retainSourceKeys ? ctx.db.normalizeId('tripPackingItems', key) : undefined;
      if (sourceId === null) throw new ConvexError('Invalid packing item reference');
      const fields = { ...value, sourceId };
      if (current) {
        itemIdByKey.set(key, current._id);
        if (
          current.label !== value.label ||
          current.quantity !== value.quantity ||
          current.sortOrder !== value.sortOrder ||
          current.sourceId !== sourceId
        ) {
          await ctx.db.patch('tripPackingItems', current._id, {
            ...fields,
            updatedAt: Date.now()
          });
        }
      } else {
        itemIdByKey.set(
          key,
          await ctx.db.insert('tripPackingItems', {
            ...fields,
            organizationId: ctx.workspace.organizationId,
            tripId: ctx.trip._id,
            updatedAt: Date.now()
          })
        );
      }
    })
  );

  const retainedItems = new Set(itemIdByKey.values());
  const itemKeyById = new Map(
    existing.items.map((item) => [item._id, String(item.sourceId ?? item._id)])
  );
  const existingBringers = new Map<string, Doc<'tripPackingBringers'>>(
    existing.bringers.flatMap((bringer) => {
      const itemKey = itemKeyById.get(bringer.itemId);
      // Only the row that owns this key counts; a duplicate-key item's bringers are dropped.
      if (!itemKey || existingByKey.get(itemKey)?._id !== bringer.itemId) return [];
      return [[`${itemKey}--${bringer.userId}`, bringer] as const];
    })
  );
  const retainedBringers = new Set<Id<'tripPackingBringers'>>();
  await Promise.all(
    snapshot.bringers.map(async ({ key, value }) => {
      // A merge can keep a claim whose item the other side deleted: the claim goes with it.
      const itemId = itemIdByKey.get(value.itemKey);
      if (!itemId) return;
      const current = existingBringers.get(key);
      if (current) {
        retainedBringers.add(current._id);
        if (current.count !== value.count) {
          await ctx.db.patch('tripPackingBringers', current._id, {
            count: value.count,
            updatedAt: Date.now()
          });
        }
        return;
      }
      await ctx.db.insert('tripPackingBringers', {
        count: value.count,
        itemId,
        organizationId: ctx.workspace.organizationId,
        tripId: ctx.trip._id,
        updatedAt: Date.now(),
        userId: value.userId
      });
    })
  );

  await Promise.all([
    ...existing.bringers.map(async (bringer) => {
      if (!retainedBringers.has(bringer._id))
        await ctx.db.delete('tripPackingBringers', bringer._id);
    }),
    ...existing.items.map(async (item) => {
      if (!retainedItems.has(item._id)) await ctx.db.delete('tripPackingItems', item._id);
    })
  ]);
}
