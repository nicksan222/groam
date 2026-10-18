import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Media } from '#convex/modules/media/library/index';

export const run = mutation({
  args: {},
  returns: v.string(),
  handler: (ctx) => Media.generateUploadUrl(ctx)
});
