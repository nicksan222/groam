import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { DiscussionValidators } from '#convex/modules/discussions/threads/schema';
import { query } from '#convex-generated/server';

export const run = query({
  args: {},
  returns: v.array(DiscussionValidators.member),
  handler: (ctx) => Discussions.roster(ctx)
});
