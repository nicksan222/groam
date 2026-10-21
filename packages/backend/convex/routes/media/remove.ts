import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Media } from '#convex/modules/media/library/index';
import { accessOriginValidator } from '#convex/modules/media/library/validators';

export const run = mutation({
  args: { mediaId: v.id('media'), accessOrigin: v.optional(accessOriginValidator) },
  returns: v.null(),
  handler: async (ctx, { mediaId, accessOrigin }) =>
    (await Media.find(ctx, mediaId, accessOrigin)).delete()
});
