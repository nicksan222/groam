import { v } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { mediaOriginsValidator } from '#convex/modules/media/library/validators';
import { TripTargets } from '#convex/modules/travel/targets/index';
import { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import { mutableTripMutation, patchTrip } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    mediaOrigins: v.optional(mediaOriginsValidator),
    mediaIds: v.array(v.id('media')),
    target: TripTargetValidators.attachable
  },
  returns: v.null(),
  handler: async (ctx, { mediaIds, target, mediaOrigins }) => {
    await TripTargets.assertBelongsToTrip(ctx, ctx, target);
    const changed = await Attachments.setTarget(ctx, {
      maximum: Attachments.limitFor(target),
      mediaIds,
      mediaOrigins,
      organizationId: ctx.workspace.organizationId,
      workspace: ctx.workspace,
      target,
      tripId: ctx.trip._id
    });
    if (changed) await patchTrip(ctx, { updatedAt: Date.now() });
    return null;
  }
});
