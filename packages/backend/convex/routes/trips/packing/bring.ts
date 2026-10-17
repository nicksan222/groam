import { v } from 'convex/values';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const run = mutableTripMutation({
  args: TripPackingValidators.bringInput,
  returns: v.null(),
  handler: async (ctx, input) => {
    await TripPacking.bring(ctx, input);
    if (input.count > 0) {
      await TripVersions.requestReview(ctx, input.userId, 'asked you to bring something');
    }
    return null;
  }
});
