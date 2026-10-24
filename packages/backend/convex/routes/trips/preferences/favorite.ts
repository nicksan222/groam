import { v } from 'convex/values';
import { TripPreferences } from '#convex/modules/travel/preferences/index';
import { tripMutation } from '#convex/modules/travel/trips/ctx';

export const run = tripMutation({
  args: {
    favorite: v.boolean()
  },
  returns: v.null(),
  handler: async (ctx, { favorite }) => TripPreferences.setFavorite(ctx, ctx.trip._id, favorite)
});
