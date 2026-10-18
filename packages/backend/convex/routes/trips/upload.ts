import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripCover } from '#convex/modules/travel/covers/index';

export const run = workspaceMutation({
  args: {},
  returns: v.string(),
  handler: (ctx) => TripCover.generateUploadUrl(ctx)
});
