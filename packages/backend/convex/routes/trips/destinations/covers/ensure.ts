import { v } from 'convex/values';
import { DestinationCover } from '#convex/modules/travel/covers/destination/index';
import { tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: {},
  returns: v.null(),
  handler: (ctx) => DestinationCover.ensureForTrip(ctx, ctx.trip._id)
});
