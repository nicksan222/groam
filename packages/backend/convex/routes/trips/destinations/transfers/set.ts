import { v } from 'convex/values';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    fromDestinationId: v.id('tripDestinations'),
    input: TripTransferValidators.input,
    toDestinationId: v.id('tripDestinations')
  },
  returns: v.id('tripDestinationTransfers'),
  handler: (ctx, { fromDestinationId, input, toDestinationId }) =>
    TripTransfer.setDestination(ctx, ctx.trip._id, fromDestinationId, toDestinationId, input)
});
