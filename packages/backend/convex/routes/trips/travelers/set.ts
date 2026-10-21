import { ConvexError, v } from 'convex/values';
import { hasSeat } from '#convex/modules/payments/index';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';
import { previewSharedTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = previewSharedTripMutation({
  args: {
    status: TripTravelerValidators.status,
    userId: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, { status, userId = ctx.workspace.userId }) => {
    // Without a seat, even organizers only answer for themselves.
    if (userId !== ctx.workspace.userId && !(await hasSeat(ctx, ctx.trip, ctx.workspace.userId)))
      throw new ConvexError('You can only update your own RSVP');
    return TripTravelers.setStatus(ctx, userId, status);
  }
});
