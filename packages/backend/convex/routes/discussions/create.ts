import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: {
    clientRequestId: v.string(),
    memberUserIds: v.array(v.string()),
    title: v.string(),
    tripId: v.optional(v.id('trips'))
  },
  returns: v.id('discussions'),
  handler: (ctx, args) =>
    Discussions.create(ctx, {
      clientRequestId: args.clientRequestId,
      memberUserIds: args.memberUserIds,
      title: args.title,
      tripId: args.tripId
    })
});
