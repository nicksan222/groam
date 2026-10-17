import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { DiscussionLinks } from '#convex/modules/discussions/links/index';
import { DiscussionLinkValidators } from '#convex/modules/discussions/links/schema';

/** Researches linked to an issue, idea, or itinerary item that the caller can open. */
export const run = query({
  args: { target: DiscussionLinkValidators.target },
  returns: v.array(DiscussionLinkValidators.linkedResearch),
  handler: async (ctx, { target }) =>
    DiscussionLinks.listForTarget(ctx, await requireWorkspace(ctx), target)
});
