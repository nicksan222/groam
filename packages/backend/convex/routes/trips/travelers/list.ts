import { v } from 'convex/values';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';
import { sharedTripQuery } from '#convex/modules/travel/trips/ctx';

export const run = sharedTripQuery({
  args: {},
  returns: v.array(TripTravelerValidators.traveler),
  handler: (ctx) => TripTravelers.list(ctx)
});
