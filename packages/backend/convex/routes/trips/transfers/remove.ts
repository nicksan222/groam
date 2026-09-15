import { v } from 'convex/values';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    transferId: v.id('tripBoundaryTransfers')
  },
  returns: v.null(),
  handler: (ctx, { transferId }) => TripTransfer.removeBoundary(ctx, ctx.trip._id, transferId)
});
