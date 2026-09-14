import { v } from 'convex/values';
import { workspaceAction } from '#convex/modules/auth/workspace';
import { Files } from '#convex/modules/media/files/index';
import { TripValidators } from '#convex/modules/travel/trips/schema';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

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

    const file = await Files.inspect(ctx, input.coverStorageId, input.coverContentType);
    return await ctx.runMutation(internal.modules.travel.trips.commit.create, {
      input: { ...input, coverContentType: file.contentType },
      signatureValid: file.signatureValid
    });
  }
});
