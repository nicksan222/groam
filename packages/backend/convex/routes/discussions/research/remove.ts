import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Research } from '#convex/modules/discussions/research/index';

/** Deletes a research and everything in it; creator or trip organizer only. */
export const run = mutation({
  args: { discussionId: v.id('discussions') },
  returns: v.null(),
  handler: (ctx, { discussionId }) => Research.remove(ctx, discussionId)
});
