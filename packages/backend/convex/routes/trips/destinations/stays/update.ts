import { v } from 'convex/values';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripStayValidators } from '#convex/modules/travel/stays/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    input: TripStayValidators.input,
    stayId: v.id('tripDestinationStays')
  },
  returns: v.null(),
  handler: async (ctx, { input, stayId }) =>
    await (await TripStay.find(ctx, ctx.trip._id, stayId)).update(input)
});
