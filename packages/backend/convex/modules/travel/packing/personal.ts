import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import type { TripCtx } from '#convex/modules/travel/trips/ctx';
import { MAX_PACKING_ITEMS, MAX_PACKING_LABEL_LENGTH } from './schema';

/**
 * Personal lists are private and live: they belong to the signed-in traveler and the shared
 * trip, never to an idea working copy. Callers bind `ctx` with the shared-trip builders.
 */
function present(row: Pick<Doc<'tripPersonalPackingItems'>, '_id' | 'label' | 'packed'>) {
  return { id: row._id, label: row.label, packed: row.packed };
}

async function ownRows(ctx: TripCtx) {
  const rows = await ctx.db
    .query('tripPersonalPackingItems')
    .withIndex('by_tripId_and_userId_and_sortOrder', (query) =>
      query.eq('tripId', ctx.trip._id).eq('userId', ctx.workspace.userId)
    )
    .take(MAX_PACKING_ITEMS + 1);
  if (rows.length > MAX_PACKING_ITEMS) {
    throw new ConvexError(`Personal lists support up to ${MAX_PACKING_ITEMS} items`);
  }
  return rows;
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

function assertWritable(ctx: TripCtx) {
  if (ctx.trip.archive !== undefined) throw new ConvexError('Archived trips are read-only');
}

async function loadOwn(ctx: TripCtx<MutationCtx>, itemId: Id<'tripPersonalPackingItems'>) {
  const row = await ctx.db.get('tripPersonalPackingItems', itemId);
  // Other travelers' rows look identical to missing ones.
  if (!row || row.tripId !== ctx.trip._id || row.userId !== ctx.workspace.userId) {
    throw new ConvexError('Packing item not found');
  }
  return row;
}

export async function listPersonalPacking(ctx: TripCtx) {
  return (await ownRows(ctx)).map(present);
}

export async function addPersonalPackingItem(ctx: TripCtx<MutationCtx>, label: string) {
  assertWritable(ctx);
  const rows = await ownRows(ctx);
  if (rows.length >= MAX_PACKING_ITEMS) {
    throw new ConvexError(`Personal lists support up to ${MAX_PACKING_ITEMS} items`);
  }
  const normalized = normalizeLabel(label);
  const id = await ctx.db.insert('tripPersonalPackingItems', {
    label: normalized,
    organizationId: ctx.workspace.organizationId,
    packed: false,
    sortOrder: rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1,
    tripId: ctx.trip._id,
    updatedAt: Date.now(),
    userId: ctx.workspace.userId
  });
  return present({ _id: id, label: normalized, packed: false });
}

export async function updatePersonalPackingItem(
  ctx: TripCtx<MutationCtx>,
  itemId: Id<'tripPersonalPackingItems'>,
  input: { label?: string; packed?: boolean }
) {
  assertWritable(ctx);
  const row = await loadOwn(ctx, itemId);
  if (input.label === undefined && input.packed === undefined) {
    throw new ConvexError('Provide a packed state or a new name');
  }
  const label = input.label === undefined ? row.label : normalizeLabel(input.label);
  const packed = input.packed ?? row.packed;
  if (label !== row.label || packed !== row.packed) {
    await ctx.db.patch('tripPersonalPackingItems', itemId, {
      label,
      packed,
      updatedAt: Date.now()
    });
  }
  return present({ _id: itemId, label, packed });
}

export async function removePersonalPackingItem(
  ctx: TripCtx<MutationCtx>,
  itemId: Id<'tripPersonalPackingItems'>
) {
  assertWritable(ctx);
  await loadOwn(ctx, itemId);
  await ctx.db.delete('tripPersonalPackingItems', itemId);
  return null;
}

export const TripPersonalPacking = {
  add: addPersonalPackingItem,
  list: listPersonalPacking,
  remove: removePersonalPackingItem,
  update: updatePersonalPackingItem
};
