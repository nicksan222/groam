import { v } from 'convex/values';
import { query } from '#convex-generated/server';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { DiscussionValidators } from '#convex/modules/discussions/threads/schema';

/** Attachments keyed by agent message id — independent of useUIMessages payload shape. */
export const run = query({
  args: { discussionId: v.id('discussions') },
  returns: v.record(v.string(), v.array(DiscussionValidators.messageMedia)),
  handler: (ctx, { discussionId }) => Discussions.listMessageAttachments(ctx, discussionId)
});
