import { v } from 'convex/values';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { TripCover } from '#convex/modules/travel/covers/index';
import { internalMutableTripMutation } from '#convex/modules/travel/trips/ctx';
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

export const setCover = internalMutableTripMutation({
  args: {
    contentType: v.optional(v.string()),
    signatureValid: v.boolean(),
    storageId: v.id('_storage')
  },
  returns: v.null(),
  handler: async (ctx, { contentType, signatureValid, storageId }) =>
    (await TripCover.find(ctx, ctx.trip._id)).set(storageId, contentType, signatureValid)
});
