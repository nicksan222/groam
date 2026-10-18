import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { Research } from '#convex/modules/discussions/research/index';
import { ResearchValidators } from '#convex/modules/discussions/research/schema';

export const run = query({
  args: { discussionId: v.id('discussions') },
  returns: ResearchValidators.detail,
  handler: (ctx, { discussionId }) => Research.get(ctx, discussionId)
});
