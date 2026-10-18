import { v } from 'convex/values';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import { TripTravelerValidators } from '#convex/modules/travel/travelers/schema';
import { internalSharedTripMutation } from '#convex/modules/travel/trips/ctx';
import { TripVersions } from '#convex/modules/travel/versions/index';

export const setTripVersionApproval = internalWorkspaceMutation({
  args: { approved: v.boolean(), proposalId: v.id('tripProposals') },
  returns: v.null(),
  handler: (ctx, { approved, proposalId }) => TripVersions.setApproval(ctx, proposalId, approved)
});

export const setTravelerRsvp = internalSharedTripMutation({
  args: {
    status: TripTravelerValidators.status,
    userId: v.optional(v.string())
  },
  returns: v.null(),
  handler: (ctx, { status, userId }) =>
    TripTravelers.setStatus(ctx, userId ?? ctx.workspace.userId, status)
});
