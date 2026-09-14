import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: TripPackingValidators.updateInput,
  returns: TripPackingValidators.item,
  handler: async (ctx, { itemId, label, packed }) =>
    await TripPacking.update(ctx, itemId, { label, packed })
});
