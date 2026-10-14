import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { Media } from '#convex/modules/media/library/index';
import { listedMediaValidator } from '#convex/modules/media/library/validators';

export const run = query({
  args: { limit: v.number() },
  returns: v.array(listedMediaValidator),
  handler: (ctx, { limit }) => Media.list(ctx, limit)
});
