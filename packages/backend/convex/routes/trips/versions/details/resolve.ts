import { v } from 'convex/values';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';
import {
  applyDetailResolution,
  detailResolutionArgs
} from '#convex/modules/travel/versions/detailresolution';

export const run = mutableTripMutation({
  args: detailResolutionArgs,
  returns: v.null(),
  handler: (ctx, args) => applyDetailResolution(ctx, args)
});
