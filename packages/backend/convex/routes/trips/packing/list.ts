import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { tripQuery } from '#convex/modules/travel/trips/ctx';

export const run = tripQuery({
  args: {},
  returns: TripPackingValidators.list,
  handler: async (ctx) => await TripPacking.list(ctx)
});
