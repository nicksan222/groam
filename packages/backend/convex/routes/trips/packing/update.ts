import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: TripPackingValidators.updateInput,
  returns: TripPackingValidators.writtenItem,
  handler: async (ctx, { itemId, label, quantity }) =>
    await TripPacking.update(ctx, itemId, { label, quantity })
});
