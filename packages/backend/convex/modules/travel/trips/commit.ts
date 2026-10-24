import { v } from 'convex/values';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { createTrip } from '#convex/modules/travel/trips/index';
import { TripValidators } from '#convex/modules/travel/trips/schema';

export const create = internalWorkspaceMutation({
  args: {
    input: TripValidators.createInput,
    signatureValid: v.boolean()
  },
  returns: v.id('trips'),
  handler: async (ctx, { input, signatureValid }) =>
    (await createTrip(ctx, input, signatureValid)).trip._id
});
