import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { discoverMedia } from '#convex/modules/media/library/discovery';
import { listedMediaValidator } from '#convex/modules/media/library/validators';

/** Explicit manual continuation; never pass these cursors to usePaginatedQuery. */
export const run = query({
  args: { cursor: v.optional(v.union(v.string(), v.null())), mediaId: v.optional(v.id('media')) },
  returns: v.object({
    items: v.array(listedMediaValidator),
    cursor: v.union(v.string(), v.null()),
    done: v.boolean()
  }),
  handler: async (ctx, args) => discoverMedia(ctx, await requireWorkspace(ctx), args)
});
