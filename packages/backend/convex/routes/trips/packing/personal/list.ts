import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { sharedTripQuery } from '#convex/modules/travel/trips/ctx';

export const run = sharedTripQuery({
  args: {},
  returns: TripPackingValidators.personalList,
  handler: async (ctx) => await TripPersonalPacking.list(ctx)
});
