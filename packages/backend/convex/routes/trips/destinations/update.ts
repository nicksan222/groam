import { v } from 'convex/values';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { destinationMutation } from '#convex/modules/travel/trips/ctx';

export const run = destinationMutation({
  args: {
    dayNotes: v.optional(v.string()),
    endDay: v.optional(v.number()),
    startDay: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, { dayNotes, endDay, startDay }) =>
    TripDestination.fromCtx(ctx).update(dayNotes, startDay, endDay)
});
