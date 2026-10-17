import { v } from 'convex/values';
import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { sharedTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = sharedTripMutation({
  args: { itemId: v.id('tripPersonalPackingItems') },
  returns: v.null(),
  handler: async (ctx, { itemId }) => await TripPersonalPacking.remove(ctx, itemId)
});
