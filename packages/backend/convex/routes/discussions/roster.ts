import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { DiscussionValidators } from '#convex/modules/discussions/threads/schema';

export const run = query({
  args: { tripId: v.optional(v.id('trips')) },
  returns: v.array(DiscussionValidators.member),
  handler: (ctx, { tripId }) => Discussions.roster(ctx, tripId)
});
