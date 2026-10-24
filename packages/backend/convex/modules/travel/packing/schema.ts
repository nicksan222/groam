import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';

export const MAX_PACKING_ITEMS = 200;
export const MAX_PACKING_QUANTITY = 99;
/** Version snapshots hold at most 525 files, so bringers share that budget with the items. */
export const MAX_PACKING_BRINGERS = 300;

export const TripPackingVersionModel = VersionedModel.define({
  label: VersionDiff.text(v.string(), 'Item'),
  quantity: VersionDiff.text(v.number(), 'Needed'),
  sortOrder: VersionDiff.hidden(v.number(), 'Position')
});

/** One file per (item, traveler), so two ideas claiming one item for different people merge. */
export const TripPackingBringerVersionModel = VersionedModel.define({
  count: VersionDiff.text(v.number(), 'Bringing'),
  itemKey: VersionDiff.hidden(v.string(), 'Item reference'),
  userId: VersionDiff.hidden(v.string(), 'Traveler')
});

const bringer = v.object({
  count: v.number(),
  image: v.optional(v.union(v.string(), v.null())),
  name: v.string(),
  userId: v.string()
});

const item = v.object({
  bringers: v.array(bringer),
  brought: v.number(),
  id: v.id('tripPackingItems'),
  label: v.string(),
  quantity: v.number()
});

/** What a write returns: the item without the roster-derived bringer list. */
const writtenItem = v.object({
  id: v.id('tripPackingItems'),
  label: v.string(),
  quantity: v.number()
});

const personalItem = v.object({
  id: v.id('tripPersonalPackingItems'),
  label: v.string(),
  packed: v.boolean()
});

export const TripPackingValidators = {
  addInput: {
    label: v.string(),
    quantity: v.optional(v.number())
  },
  bringInput: {
    count: v.number(),
    itemId: v.id('tripPackingItems'),
    userId: v.string()
  },
  bringer,
  item,
  list: v.array(item),
  personalAddInput: { label: v.string() },
  personalItem,
  personalList: v.array(personalItem),
  personalUpdateInput: {
    itemId: v.id('tripPersonalPackingItems'),
    label: v.optional(v.string()),
    packed: v.optional(v.boolean())
  },
  updateInput: {
    itemId: v.id('tripPackingItems'),
    label: v.optional(v.string()),
    quantity: v.optional(v.number())
  },
  writtenItem
};

export const tripPackingTables = {
  tripPackingBringers: defineTable({
    count: v.number(),
    itemId: v.id('tripPackingItems'),
    organizationId: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number(),
    userId: v.string()
  })
    .index('by_tripId', ['tripId'])
    .index('by_itemId_and_userId', ['itemId', 'userId']),
  tripPackingItems: defineTable({
    label: v.string(),
    organizationId: v.string(),
    /** Legacy checklist state. Rows still carrying it are dropped by `cleanup.dropLegacyItems`. */
    packed: v.optional(v.boolean()),
    /** Absent only on legacy rows awaiting cleanup; every live row has it. */
    quantity: v.optional(v.number()),
    sortOrder: v.number(),
    sourceId: v.optional(v.id('tripPackingItems')),
    tripId: v.id('trips'),
    updatedAt: v.number()
  }).index('by_tripId_and_sortOrder', ['tripId', 'sortOrder']),
  /** Private, live, never versioned: always keyed by the shared trip and its owner. */
  tripPersonalPackingItems: defineTable({
    label: v.string(),
    organizationId: v.string(),
    packed: v.boolean(),
    sortOrder: v.number(),
    tripId: v.id('trips'),
    updatedAt: v.number(),
    userId: v.string()
  }).index('by_tripId_and_userId_and_sortOrder', ['tripId', 'userId', 'sortOrder'])
};
