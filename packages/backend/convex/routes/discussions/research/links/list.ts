import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { DiscussionLinkValidators } from '#convex/modules/discussions/links/schema';

/** Links of one research with display labels; deleted targets are omitted. */
export const run = query({
  args: { discussionId: v.id('discussions') },
  returns: v.array(DiscussionLinkValidators.resolvedLink),
  handler: (ctx, { discussionId }) => DiscussionLinks.listForDiscussion(ctx, discussionId)
});
