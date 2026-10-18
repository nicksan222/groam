import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';
import { Discussions } from '#convex/modules/discussions/threads/index';

const DELETE_BATCH_SIZE = 50;

/** Finishes removing a discussion whose dependents did not fit in one transaction. */
export const purgeDiscussion = internalMutation({
  args: { discussionId: v.id('discussions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const discussion = await ctx.db.get('discussions', args.discussionId);
    if (!discussion) return null;
    if (await Discussions.purge(ctx, discussion, DELETE_BATCH_SIZE)) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.discussions.threads.cleanup.purgeDiscussion,
        args
      );
    }
    return null;
  }
});

export const removeOrganizationMember = internalMutation({
  args: { organizationId: v.string(), userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const hasMore = await Discussions.removeOrganizationMemberBatch(
      ctx,
      args.organizationId,
      args.userId,
      DELETE_BATCH_SIZE
    );
    if (hasMore) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.discussions.threads.cleanup.removeOrganizationMember,
        args
      );
    }
    return null;
  }
});
