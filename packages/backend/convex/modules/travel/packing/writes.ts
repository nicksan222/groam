import { v } from 'convex/values';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { internalMutableTripMutation, internalTripQuery } from '#convex/modules/travel/trips/ctx';

export const list = internalTripQuery({
  args: {},
  returns: TripPackingValidators.list,
  handler: async (ctx) => await TripPacking.list(ctx)
});

export const add = internalMutableTripMutation({
  args: TripPackingValidators.addInput,
  returns: TripPackingValidators.item,
  handler: async (ctx, { label }) => await TripPacking.add(ctx, label)
});

export const update = internalMutableTripMutation({
  args: TripPackingValidators.updateInput,
  returns: TripPackingValidators.item,
  handler: async (ctx, { itemId, label, packed }) =>
    await TripPacking.update(ctx, itemId, { label, packed })
});

export const remove = internalMutableTripMutation({
  args: { itemId: v.id('tripPackingItems') },
  returns: v.null(),
  handler: async (ctx, { itemId }) => await TripPacking.remove(ctx, itemId)
});
