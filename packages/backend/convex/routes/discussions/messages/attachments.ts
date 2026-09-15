import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { DiscussionValidators } from '#convex/modules/discussions/threads/schema';
import { query } from '#convex-generated/server';

/** Attachments keyed by agent message id — independent of useUIMessages payload shape. */
export const run = query({
  args: { discussionId: v.id('discussions') },
  returns: v.record(v.string(), v.array(DiscussionValidators.messageMedia)),
  handler: (ctx, { discussionId }) => Discussions.listMessageAttachments(ctx, discussionId)
});
