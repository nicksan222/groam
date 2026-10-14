import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Media } from '#convex/modules/media/library/index';

export const run = mutation({
  args: { mediaId: v.id('media') },
  returns: v.null(),
  handler: async (ctx, { mediaId }) => (await Media.find(ctx, mediaId)).delete()
});
