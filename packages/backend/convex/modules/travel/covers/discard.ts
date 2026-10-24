import { v } from 'convex/values';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { TripCover } from '#convex/modules/travel/covers/index';

/** Remove a trip-creation cover upload that failed validation. */
export const discardUpload = internalWorkspaceMutation({
  args: { storageId: v.id('_storage') },
  returns: v.null(),
  handler: (ctx, { storageId }) => TripCover.discardUnusedUpload(ctx, storageId)
});
