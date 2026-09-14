import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { internal } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';

const DELETE_BATCH_SIZE = 50;

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
