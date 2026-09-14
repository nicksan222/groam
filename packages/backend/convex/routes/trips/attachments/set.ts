import { v } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { TripTargets } from '#convex/modules/travel/targets/index';
import { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import { mutableTripMutation, patchTrip } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    mediaIds: v.array(v.id('media')),
    target: TripTargetValidators.attachable
  },
  returns: v.null(),
  handler: async (ctx, { mediaIds, target }) => {
    await TripTargets.assertBelongsToTrip(ctx, ctx, target);
    const changed = await Attachments.setTarget(
      ctx,
      ctx.trip._id,
      target,
      mediaIds,
      ctx.workspace.organizationId,
      Attachments.limitFor(target)
    );
    if (changed) await patchTrip(ctx, { updatedAt: Date.now() });
    return null;
  }
});
