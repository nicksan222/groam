import { v } from 'convex/values';
import { OrganizationInvitations } from '#convex/modules/organizations/invitations/index';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: { code: v.string() },
  returns: v.object({
    membership: v.union(v.literal('existing'), v.literal('joined')),
    organizationId: v.string()
  }),
  handler: (ctx, { code }) => OrganizationInvitations.redeem(ctx, code)
});
