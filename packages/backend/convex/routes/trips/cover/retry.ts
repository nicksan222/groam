import { v } from 'convex/values';
import { TripCover } from '#convex/modules/travel/covers/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => (await TripCover.find(ctx, ctx.trip._id)).retry()
});
