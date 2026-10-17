import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { DiscussionLinkValidators } from '#convex/modules/discussions/links/schema';

export const run = mutation({
  args: { discussionId: v.id('discussions'), target: DiscussionLinkValidators.target },
  returns: v.null(),
  handler: (ctx, { discussionId, target }) => DiscussionLinks.unlink(ctx, discussionId, target)
});
