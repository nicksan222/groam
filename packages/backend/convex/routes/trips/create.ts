import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { Files } from '#convex/modules/media/files/index';
import { TripValidators } from '#convex/modules/travel/trips/schema';

export const run = workspaceAction({
  args: { input: TripValidators.createInput },
  returns: v.id('trips'),
  handler: async (ctx, { input }): Promise<Id<'trips'>> => {
    if (!input.coverStorageId) {
      return await ctx.runMutation(internal.modules.travel.trips.commit.create, {
        input,
        signatureValid: true
      });
    }

    const { coverStorageId } = input;
    try {
      const file = await Files.inspect(ctx, coverStorageId, input.coverContentType);
      return await ctx.runMutation(internal.modules.travel.trips.commit.create, {
        input: { ...input, coverContentType: file.contentType },
        signatureValid: file.signatureValid
      });
    } catch (error) {
      await ctx
        .runMutation(internal.modules.travel.covers.discard.discardUpload, {
          storageId: coverStorageId
        })
        .catch(() => null);
      throw error;
    }
  }
});
