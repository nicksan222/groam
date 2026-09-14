import { v } from 'convex/values';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    fromActivityId: v.id('tripDestinationActivities'),
    input: TripTransferValidators.input,
    toActivityId: v.id('tripDestinationActivities')
  },
  returns: v.id('tripActivityTransfers'),
  handler: (ctx, { fromActivityId, input, toActivityId }) =>
    TripTransfer.setActivity(ctx, ctx.trip._id, fromActivityId, toActivityId, input)
});
