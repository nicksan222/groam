import { v } from 'convex/values';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripStayValidators } from '#convex/modules/travel/stays/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: TripStayValidators.addArgs,
  returns: v.id('tripDestinationStays'),
  handler: (ctx, { destinationId, input }) => TripStay.add(ctx, ctx.trip._id, destinationId, input)
});
