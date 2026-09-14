import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';

export const MAX_PACKING_ITEMS = 200;
export const MAX_PACKING_LABEL_LENGTH = 120;

export const TripPackingVersionModel = VersionedModel.define({
  label: VersionDiff.text(v.string(), 'Item'),
  packed: VersionDiff.text(v.boolean(), 'Packed'),
  sortOrder: VersionDiff.hidden(v.number(), 'Position')
});

const item = v.object({
  id: v.id('tripPackingItems'),
  label: v.string(),
  packed: v.boolean()
});

export const TripPackingValidators = {
  addInput: {
    label: v.string()
  },
  item,
  list: v.array(item),
  updateInput: {
    itemId: v.id('tripPackingItems'),
    label: v.optional(v.string()),
    packed: v.optional(v.boolean())
  }
};

export const tripPackingTables = {
  tripPackingItems: defineTable({
    label: v.string(),
    organizationId: v.string(),
    packed: v.boolean(),
    sortOrder: v.number(),
    sourceId: v.optional(v.id('tripPackingItems')),
    tripId: v.id('trips'),
    updatedAt: v.number()
  }).index('by_tripId_and_sortOrder', ['tripId', 'sortOrder'])
};
