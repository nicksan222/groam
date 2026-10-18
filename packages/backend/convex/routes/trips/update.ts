import { v } from 'convex/values';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';
import { updateTrip } from '#convex/modules/travel/trips/index';
import { TripValidators } from '#convex/modules/travel/trips/schema';

export const run = mutableTripMutation({
  args: { input: TripValidators.updateInput },
  returns: v.null(),
  handler: (ctx, { input }) => updateTrip(ctx, ctx.trip._id, input)
});
