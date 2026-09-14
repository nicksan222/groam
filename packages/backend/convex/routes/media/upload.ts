import { v } from 'convex/values';
import { Media } from '#convex/modules/media/library/index';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: {},
  returns: v.string(),
  handler: (ctx) => Media.generateUploadUrl(ctx)
});
