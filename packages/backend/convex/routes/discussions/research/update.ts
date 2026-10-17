import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Research } from '#convex/modules/discussions/research/index';

/** Subject and brief; creator or trip organizer only. An empty brief clears it. */
export const run = mutation({
  args: {
    brief: v.optional(v.string()),
    discussionId: v.id('discussions'),
    title: v.optional(v.string())
  },
  returns: v.null(),
  handler: (ctx, { discussionId, ...patch }) => Research.update(ctx, discussionId, patch)
});
