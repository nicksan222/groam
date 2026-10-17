import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { sharedTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = sharedTripMutation({
  args: TripPackingValidators.personalAddInput,
  returns: TripPackingValidators.personalItem,
  handler: async (ctx, { label }) => await TripPersonalPacking.add(ctx, label)
});
