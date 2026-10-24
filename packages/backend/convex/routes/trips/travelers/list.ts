import { v } from 'convex/values';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';
import { previewSharedTripQuery } from '#convex/modules/travel/trips/ctx';

export const run = previewSharedTripQuery({
  args: {},
  returns: v.array(TripTravelerValidators.traveler),
  handler: (ctx) => TripTravelers.list(ctx)
});
