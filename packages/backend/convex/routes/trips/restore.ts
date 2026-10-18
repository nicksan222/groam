import { v } from 'convex/values';
import { restoreTrip, tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => restoreTrip(ctx)
});
