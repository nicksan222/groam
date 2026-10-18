import { v } from 'convex/values';
import { TripCover } from '#convex/modules/travel/covers/index';
import { tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: {},
  returns: v.null(),
  handler: (ctx) => TripCover.ensureForTrip(ctx, ctx.trip._id)
});
