import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: TripPackingValidators.addInput,
  returns: TripPackingValidators.item,
  handler: async (ctx, { label }) => await TripPacking.add(ctx, label)
});
