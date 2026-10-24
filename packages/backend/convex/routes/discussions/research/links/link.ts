import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { DiscussionLinkValidators } from '#convex/modules/discussions/links/schema';

/** Links a research to an issue, idea, or itinerary item of its trip. Idempotent. */
export const run = mutation({
  args: { discussionId: v.id('discussions'), target: DiscussionLinkValidators.target },
  returns: v.id('discussionLinks'),
  handler: (ctx, { discussionId, target }) => DiscussionLinks.link(ctx, discussionId, target)
});
