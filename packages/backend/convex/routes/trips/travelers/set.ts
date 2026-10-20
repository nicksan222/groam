import { v } from 'convex/values';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';
import { previewSharedTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = previewSharedTripMutation({
  args: {
    status: TripTravelerValidators.status,
    userId: v.optional(v.string())
  },
  returns: v.null(),
  handler: (ctx, { status, userId }) =>
    TripTravelers.setStatus(ctx, userId ?? ctx.workspace.userId, status)
});
