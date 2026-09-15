import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { OrganizationInvitations } from '#convex/modules/organizations/invitations/index';

export const run = workspaceMutation({
  args: { invitationCodeId: v.id('organizationInvitationCodes') },
  returns: v.null(),
  handler: (ctx, { invitationCodeId }) =>
    OrganizationInvitations.revoke(ctx, ctx.workspace, invitationCodeId)
});
