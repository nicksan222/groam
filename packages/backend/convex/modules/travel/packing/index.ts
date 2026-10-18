import { ConvexError } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { hasOrganizationMembership, workspaceRoster } from '#convex/modules/auth/workspace';
import {
  assertMutable,
  patchTrip,
  sharedTripId,
  type TripCtx
} from '#convex/modules/travel/trips/ctx';
import { MAX_VERSION_FILES } from '#convex/modules/travel/versions/snapshot/types';
import {
  MAX_PACKING_BRINGERS,
  MAX_PACKING_ITEMS,
  MAX_PACKING_LABEL_LENGTH,
  MAX_PACKING_QUANTITY
} from './schema';

const LEGACY_SLACK = 100;

export type PackingItemRow = Doc<'tripPackingItems'> & { quantity: number };

function isCurrent(row: Doc<'tripPackingItems'>): row is PackingItemRow {
  return row.quantity !== undefined;
}

/** Rows written before groups had a quantity are invisible; `dropLegacyItems` removes them. */
async function packingRows(
  ctx: MutationCtx | QueryCtx,
  tripId: Id<'trips'>
): Promise<PackingItemRow[]> {
  const rows = await ctx.db
    .query('tripPackingItems')
    .withIndex('by_tripId_and_sortOrder', (query) => query.eq('tripId', tripId))
    .take(MAX_PACKING_ITEMS + 1 + LEGACY_SLACK);
  // Legacy rows are invisible, so they do not count toward the cap before the cleanup runs.
  const current = rows.filter(isCurrent);
  if (current.length > MAX_PACKING_ITEMS) {
    throw new ConvexError(`Trips support up to ${MAX_PACKING_ITEMS} packing items`);
  }
  return current;
}

/** Version files a trip snapshot would hold today (the trip file plus every versioned row). */
async function versionFileCount(ctx: MutationCtx, tripId: Id<'trips'>) {
  const limit = MAX_VERSION_FILES + 1;
  const counts = await Promise.all([
    ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(limit),
    ctx.db
      .query('tripDestinationActivities')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(limit),
    ctx.db
      .query('tripDestinationStays')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(limit),
    ctx.db
      .query('tripActivityTransfers')
      .withIndex('by_tripId_and_fromActivityId', (query) => query.eq('tripId', tripId))
      .take(limit),
    ctx.db
      .query('tripBoundaryTransfers')
      .withIndex('by_tripId_and_boundary', (query) => query.eq('tripId', tripId))
      .take(3),
    ctx.db
      .query('tripDestinationTransfers')
      .withIndex('by_tripId_and_fromDestinationId', (query) => query.eq('tripId', tripId))
      .take(limit),
    packingRows(ctx, tripId),
    bringerRows(ctx, tripId)
  ]);
  return 1 + counts.reduce((total, rows) => total + rows.length, 0);
}

async function assertRoomForFile(ctx: TripCtx<MutationCtx>, what: string) {
  if ((await versionFileCount(ctx, ctx.trip._id)) >= MAX_VERSION_FILES) {
    throw new ConvexError(`This trip has too many planned items to add more ${what}`);
  }
}

async function bringerRows(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const rows = await ctx.db
    .query('tripPackingBringers')
    .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
    .take(MAX_PACKING_BRINGERS + 1);
  if (rows.length > MAX_PACKING_BRINGERS) {
    throw new ConvexError(`Trips support up to ${MAX_PACKING_BRINGERS} packing assignments`);
  }
  return rows;
}

function written(row: { _id: Id<'tripPackingItems'>; label: string; quantity: number }) {
  return { id: row._id, label: row.label, quantity: row.quantity };
}

export async function listPacking(ctx: TripCtx) {
  const [items, bringers, roster] = await Promise.all([
    packingRows(ctx, ctx.trip._id),
    bringerRows(ctx, ctx.trip._id),
    workspaceRoster(ctx, ctx.workspace)
  ]);
  const members = new Map(roster.members.map((member) => [member.userId, member]));
  return items.map((item) => {
    const mine = bringers
      .filter((row) => row.itemId === item._id)
      .map((row) => {
        const member = members.get(row.userId);
        return {
          count: row.count,
          image: member?.image ?? null,
          name: member?.name ?? 'Former traveler',
          userId: row.userId
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
    return {
      bringers: mine,
      brought: mine.reduce((sum, row) => sum + row.count, 0),
      id: item._id,
      label: item.label,
      quantity: item.quantity
    };
  });
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

function wholeCount(value: number, minimum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > MAX_PACKING_QUANTITY) {
    throw new ConvexError(
      `${label} must be a whole number from ${minimum} to ${MAX_PACKING_QUANTITY}`
    );
  }
  return value;
}

async function loadItem(ctx: TripCtx<MutationCtx>, itemId: Id<'tripPackingItems'>) {
  const item = await ctx.db.get('tripPackingItems', itemId);
  if (!item || item.tripId !== ctx.trip._id || !isCurrent(item)) {
    throw new ConvexError('Packing item not found');
  }
  return item;
}

export async function addPackingItem(ctx: TripCtx<MutationCtx>, label: string, quantity = 1) {
  assertMutable(ctx);
  const rows = await packingRows(ctx, ctx.trip._id);
  if (rows.length >= MAX_PACKING_ITEMS) {
    throw new ConvexError(`Trips support up to ${MAX_PACKING_ITEMS} packing items`);
  }
  await assertRoomForFile(ctx, 'packing items');
  const normalized = normalizeLabel(label);
  const needed = wholeCount(quantity, 1, 'Quantity');
  const nextSortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  const id = await ctx.db.insert('tripPackingItems', {
    label: normalized,
    organizationId: ctx.workspace.organizationId,
    quantity: needed,
    sortOrder: nextSortOrder,
    tripId: ctx.trip._id,
    updatedAt: Date.now()
  });
  await patchTrip(ctx, { updatedAt: Date.now() });
  return written({ _id: id, label: normalized, quantity: needed });
}

export async function updatePackingItem(
  ctx: TripCtx<MutationCtx>,
  itemId: Id<'tripPackingItems'>,
  input: { label?: string; quantity?: number }
) {
  assertMutable(ctx);
  const item = await loadItem(ctx, itemId);
  if (input.label === undefined && input.quantity === undefined) {
    throw new ConvexError('Provide a quantity or a new name');
  }
  const label = input.label === undefined ? item.label : normalizeLabel(input.label);
  const quantity =
    input.quantity === undefined ? item.quantity : wholeCount(input.quantity, 1, 'Quantity');
  if (label !== item.label || quantity !== item.quantity) {
    await ctx.db.patch('tripPackingItems', itemId, { label, quantity, updatedAt: Date.now() });
    await patchTrip(ctx, { updatedAt: Date.now() });
  }
  return written({ _id: itemId, label, quantity });
}

async function deleteBringersForItem(ctx: MutationCtx, itemId: Id<'tripPackingItems'>) {
  const rows = await ctx.db
    .query('tripPackingBringers')
    .withIndex('by_itemId_and_userId', (query) => query.eq('itemId', itemId))
    .take(MAX_PACKING_BRINGERS);
  await Promise.all(rows.map((row) => ctx.db.delete('tripPackingBringers', row._id)));
}

export async function removePackingItem(ctx: TripCtx<MutationCtx>, itemId: Id<'tripPackingItems'>) {
  assertMutable(ctx);
  await loadItem(ctx, itemId);
  await deleteBringersForItem(ctx, itemId);
  await ctx.db.delete('tripPackingItems', itemId);
  await patchTrip(ctx, { updatedAt: Date.now() });
  return null;
}

/** A traveler is on the trip when RSVP'd in (not declined) or, with no answer, in the group. */
async function assertTraveler(ctx: TripCtx<MutationCtx>, userId: string) {
  const row = await ctx.db
    .query('tripTravelers')
    .withIndex('by_tripId_and_userId', (query) =>
      query.eq('tripId', sharedTripId(ctx.trip)).eq('userId', userId)
    )
    .first();
  const onTrip = row
    ? row.status !== 'not_going' && row.organizationId === ctx.workspace.organizationId
    : await hasOrganizationMembership(ctx, ctx.workspace.organizationId, userId);
  if (!onTrip) throw new ConvexError('Traveler not found on this trip');
}

/** Sets how many of an item one traveler is bringing; zero takes them off it. */
export async function bringPackingItem(
  ctx: TripCtx<MutationCtx>,
  input: { count: number; itemId: Id<'tripPackingItems'>; userId: string }
) {
  assertMutable(ctx);
  await loadItem(ctx, input.itemId);
  const count = input.count === 0 ? 0 : wholeCount(input.count, 1, 'Count');
  const existing = await ctx.db
    .query('tripPackingBringers')
    .withIndex('by_itemId_and_userId', (query) =>
      query.eq('itemId', input.itemId).eq('userId', input.userId)
    )
    .unique();
  if (count === 0 && !existing) return null;
  if (existing?.count === count) return null;
  if (count !== 0) await assertTraveler(ctx, input.userId);
  if (count === 0 && existing) {
    await ctx.db.delete('tripPackingBringers', existing._id);
  } else if (existing) {
    await ctx.db.patch('tripPackingBringers', existing._id, { count, updatedAt: Date.now() });
  } else {
    if ((await bringerRows(ctx, ctx.trip._id)).length >= MAX_PACKING_BRINGERS) {
      throw new ConvexError(`Trips support up to ${MAX_PACKING_BRINGERS} packing assignments`);
    }
    await assertRoomForFile(ctx, 'packing assignments');
    await ctx.db.insert('tripPackingBringers', {
      count,
      itemId: input.itemId,
      organizationId: ctx.workspace.organizationId,
      tripId: ctx.trip._id,
      updatedAt: Date.now(),
      userId: input.userId
    });
  }
  await patchTrip(ctx, { updatedAt: Date.now() });
  return null;
}

export async function deletePackingForTrip(ctx: MutationCtx, tripId: Id<'trips'>, limit: number) {
  const bringers = await ctx.db
    .query('tripPackingBringers')
    .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
    .take(limit);
  await Promise.all(bringers.map((row) => ctx.db.delete('tripPackingBringers', row._id)));
  const personal = await ctx.db
    .query('tripPersonalPackingItems')
    .withIndex('by_tripId_and_userId_and_sortOrder', (query) => query.eq('tripId', tripId))
    .take(limit);
  await Promise.all(personal.map((row) => ctx.db.delete('tripPersonalPackingItems', row._id)));
  const rows = await ctx.db
    .query('tripPackingItems')
    .withIndex('by_tripId_and_sortOrder', (query) => query.eq('tripId', tripId))
    .take(limit);
  await Promise.all(rows.map((row) => ctx.db.delete('tripPackingItems', row._id)));
  return bringers.length + personal.length + rows.length > 0;
}

export const TripPacking = {
  add: addPackingItem,
  bring: bringPackingItem,
  bringersForTrip: bringerRows,
  deleteForTrip: deletePackingForTrip,
  forTrip: packingRows,
  list: listPacking,
  remove: removePackingItem,
  update: updatePackingItem
};
