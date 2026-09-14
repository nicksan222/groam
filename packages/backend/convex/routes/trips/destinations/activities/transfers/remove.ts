import { v } from 'convex/values';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    transferId: v.id('tripActivityTransfers')
  },
  returns: v.null(),
  handler: (ctx, { transferId }) => TripTransfer.removeActivity(ctx, ctx.trip._id, transferId)
});
