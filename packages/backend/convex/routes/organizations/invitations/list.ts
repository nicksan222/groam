import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { OrganizationInvitations } from '#convex/modules/organizations/invitations/index';
import { OrganizationInvitationValidators } from '#convex/modules/organizations/invitations/schema';

export const run = workspaceQuery({
  args: { now: v.number() },
  returns: v.array(OrganizationInvitationValidators.invitationCode),
  handler: (ctx, args) => OrganizationInvitations.list(ctx, ctx.workspace, args.now)
});
