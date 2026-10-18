import { v } from 'convex/values';
import { TripStay } from '#convex/modules/travel/stays/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    stayId: v.id('tripDestinationStays')
  },
  returns: v.null(),
  handler: async (ctx, { stayId }) =>
    await (await TripStay.find(ctx, ctx.trip._id, stayId)).delete()
});
