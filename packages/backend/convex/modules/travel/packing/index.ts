import { ConvexError } from 'convex/values';
import { assertMutable, patchTrip, type TripCtx } from '#convex/modules/travel/trips/ctx';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { MAX_PACKING_ITEMS, MAX_PACKING_LABEL_LENGTH } from './schema';

async function packingRows(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const rows = await ctx.db
    .query('tripPackingItems')
    .withIndex('by_tripId_and_sortOrder', (query) => query.eq('tripId', tripId))
    .take(MAX_PACKING_ITEMS + 1);
  if (rows.length > MAX_PACKING_ITEMS) {
    throw new ConvexError(`Trips support up to ${MAX_PACKING_ITEMS} packing items`);
  }
  return rows;
}

function present(row: { _id: Id<'tripPackingItems'>; label: string; packed: boolean }) {
  return { id: row._id, label: row.label, packed: row.packed };
}

export async function listPacking(ctx: TripCtx) {
  return (await packingRows(ctx, ctx.trip._id)).map(present);
}

function normalizeLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) throw new ConvexError('Packing items need a name');
  if (trimmed.length > MAX_PACKING_LABEL_LENGTH) {
    throw new ConvexError(
      `Packing item names can be at most ${MAX_PACKING_LABEL_LENGTH} characters`
    );
  }
  return trimmed;
}

export async function addPackingItem(ctx: TripCtx<MutationCtx>, label: string) {
  assertMutable(ctx);
  const rows = await packingRows(ctx, ctx.trip._id);
  if (rows.length >= MAX_PACKING_ITEMS) {
    throw new ConvexError(`Trips support up to ${MAX_PACKING_ITEMS} packing items`);
  }
  const normalized = normalizeLabel(label);
  const nextSortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  const id = await ctx.db.insert('tripPackingItems', {
    label: normalized,
    organizationId: ctx.workspace.organizationId,
    packed: false,
    sortOrder: nextSortOrder,
    tripId: ctx.trip._id,
    updatedAt: Date.now()
  });
  await patchTrip(ctx, { updatedAt: Date.now() });
  return present({ _id: id, label: normalized, packed: false });
}

export async function updatePackingItem(
  ctx: TripCtx<MutationCtx>,
  itemId: Id<'tripPackingItems'>,
  input: { label?: string; packed?: boolean }
) {
  assertMutable(ctx);
  const item = await ctx.db.get('tripPackingItems', itemId);
  if (!item || item.tripId !== ctx.trip._id) {
    throw new ConvexError('Packing item not found');
  }
  if (input.label === undefined && input.packed === undefined) {
    throw new ConvexError('Provide a packed state or a new name');
  }
  const patch: { label?: string; packed?: boolean; updatedAt: number } = {
    updatedAt: Date.now()
  };
  if (input.label !== undefined) patch.label = normalizeLabel(input.label);
  if (input.packed !== undefined) patch.packed = input.packed;
  if ((patch.label ?? item.label) !== item.label || (patch.packed ?? item.packed) !== item.packed) {
    await ctx.db.patch('tripPackingItems', itemId, patch);
    await patchTrip(ctx, { updatedAt: Date.now() });
  }
  return present({
    _id: itemId,
    label: patch.label ?? item.label,
    packed: patch.packed ?? item.packed
  });
}

export async function removePackingItem(ctx: TripCtx<MutationCtx>, itemId: Id<'tripPackingItems'>) {
  assertMutable(ctx);
  const item = await ctx.db.get('tripPackingItems', itemId);
  if (!item || item.tripId !== ctx.trip._id) {
    throw new ConvexError('Packing item not found');
  }
  await ctx.db.delete('tripPackingItems', itemId);
  await patchTrip(ctx, { updatedAt: Date.now() });
  return null;
}

export async function deletePackingForTrip(ctx: MutationCtx, tripId: Id<'trips'>, limit: number) {
  const rows = await ctx.db
    .query('tripPackingItems')
    .withIndex('by_tripId_and_sortOrder', (query) => query.eq('tripId', tripId))
    .take(limit);
  await Promise.all(rows.map((row) => ctx.db.delete('tripPackingItems', row._id)));
  return rows.length > 0;
}

export const TripPacking = {
  add: addPackingItem,
  deleteForTrip: deletePackingForTrip,
  forTrip: packingRows,
  list: listPacking,
  remove: removePackingItem,
  update: updatePackingItem
};
