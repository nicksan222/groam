import { v } from 'convex/values';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: { input: TripDestinationValidators.stopInput },
  returns: v.id('tripDestinations'),
  handler: (ctx, { input }) => TripDestination.add(ctx, input)
});
