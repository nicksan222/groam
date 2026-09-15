import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { DiscussionValidators } from '#convex/modules/discussions/threads/schema';
import { query } from '#convex-generated/server';

/** Lists discussions the signed-in user belongs to in the active organization. Requires auth. */
export const run = query({
  args: {},
  returns: v.array(DiscussionValidators.listedDiscussion),
  handler: (ctx) => Discussions.list(ctx)
});
