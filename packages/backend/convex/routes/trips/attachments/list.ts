import { v } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { TripTargets } from '#convex/modules/travel/targets/index';
import { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import { tripQuery } from '#convex/modules/travel/trips/ctx';

const attachmentView = v.object({
  contentType: v.string(),
  id: v.id('attachments'),
  mediaId: v.id('media'),
  name: v.string(),
  position: v.number(),
  size: v.number(),
  url: v.union(v.string(), v.null())
});

export const run = tripQuery({
  args: { target: TripTargetValidators.attachable },
  returns: v.array(attachmentView),
  handler: async (ctx, { target }) => {
    await TripTargets.assertBelongsToTrip(ctx, ctx, target);
    return await Attachments.viewForTarget(
      ctx,
      ctx.trip._id,
      target,
      Attachments.limitFor(target),
      ctx.workspace.organizationId
    );
  }
});
