import { v } from 'convex/values';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    boundary: TripTransferValidators.boundary,
    input: TripTransferValidators.input
  },
  returns: v.id('tripBoundaryTransfers'),
  handler: (ctx, { boundary, input }) =>
    TripTransfer.setBoundary(ctx, ctx.trip._id, boundary, input)
});
