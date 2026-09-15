import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { Files } from '#convex/modules/media/files/index';
import { internal } from '#convex-generated/api';

export const run = workspaceAction({
  args: {
    contentType: v.optional(v.string()),
    storageId: v.id('_storage'),
    tripId: v.id('trips')
  },
  returns: v.null(),
  handler: async (ctx, { contentType, storageId, tripId }): Promise<null> => {
    const file = await Files.inspect(ctx, storageId, contentType);
    return await ctx.runMutation(internal.modules.travel.trips.commit.setCover, {
      contentType: file.contentType,
      signatureValid: file.signatureValid,
      storageId,
      tripId
    });
  }
});
