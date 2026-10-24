import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { populateSeedItinerary, seedItineraryArgs } from '#convex/modules/dev/populate';

export const run = workspaceMutation({
  args: seedItineraryArgs,
  returns: v.null(),
  handler: async (ctx, args) => await populateSeedItinerary(ctx, args, ctx.workspace)
});
