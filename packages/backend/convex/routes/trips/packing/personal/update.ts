import { TripPersonalPacking } from '#convex/modules/travel/packing/personal';
import { TripPackingValidators } from '#convex/modules/travel/packing/schema';
import { sharedTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = sharedTripMutation({
  args: TripPackingValidators.personalUpdateInput,
  returns: TripPackingValidators.personalItem,
  handler: async (ctx, { itemId, label, packed }) =>
    await TripPersonalPacking.update(ctx, itemId, { label, packed })
});
