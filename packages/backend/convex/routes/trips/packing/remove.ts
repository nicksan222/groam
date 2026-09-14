import { v } from 'convex/values';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: { itemId: v.id('tripPackingItems') },
  returns: v.null(),
  handler: async (ctx, { itemId }) => await TripPacking.remove(ctx, itemId)
});
