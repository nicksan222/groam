import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Media } from '#convex/modules/media/library/index';
import { groupLogoResultValidator } from '#convex/modules/media/library/validators';

/** Point the active organization's logo at an existing media item. Requires workspace membership. */
export const run = mutation({
  args: { mediaId: v.id('media') },
  returns: groupLogoResultValidator,
  handler: async (ctx, { mediaId }) => (await Media.find(ctx, mediaId)).setAsGroupLogo()
});
