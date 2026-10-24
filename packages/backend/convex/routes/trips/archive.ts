import { v } from 'convex/values';
import { archiveTrip, tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => archiveTrip(ctx)
});
