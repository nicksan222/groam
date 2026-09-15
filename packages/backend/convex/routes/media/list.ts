import { v } from 'convex/values';
import { Media } from '#convex/modules/media/library/index';
import { listedMediaValidator } from '#convex/modules/media/library/validators';
import { query } from '#convex-generated/server';

export const run = query({
  args: { limit: v.number() },
  returns: v.array(listedMediaValidator),
  handler: (ctx, { limit }) => Media.list(ctx, limit)
});
