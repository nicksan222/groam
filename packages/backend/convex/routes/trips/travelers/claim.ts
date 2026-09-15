import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { TripTravelers } from '#convex/modules/travel/travelers/index';

export const run = workspaceMutation({
  args: { invitationId: v.string() },
  returns: v.union(v.id('trips'), v.null()),
  handler: (ctx, { invitationId }) =>
    TripTravelers.claimInvitation(ctx, invitationId, ctx.workspace)
});
