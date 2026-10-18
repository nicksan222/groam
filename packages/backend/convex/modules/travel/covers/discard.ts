import { v } from 'convex/values';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { TripCover } from '#convex/modules/travel/covers/index';
import { internalMutableTripMutation } from '#convex/modules/travel/trips/ctx';

/** Remove a trip-creation cover upload that failed validation. */
export const discardUpload = internalWorkspaceMutation({
  args: { storageId: v.id('_storage') },
  returns: v.null(),
  handler: (ctx, { storageId }) => TripCover.discardUnusedUpload(ctx, storageId)
});

/** Remove a cover replacement upload that failed validation; callers must be able to edit the trip. */
export const discardTripUpload = internalMutableTripMutation({
  args: { storageId: v.id('_storage') },
  returns: v.null(),
  handler: (ctx, { storageId }) => TripCover.discardUnusedUpload(ctx, storageId)
});
