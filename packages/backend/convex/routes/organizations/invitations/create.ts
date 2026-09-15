import { workspaceMutation } from '#convex/modules/auth/workspace';
import { OrganizationInvitations } from '#convex/modules/organizations/invitations/index';
import { OrganizationInvitationValidators } from '#convex/modules/organizations/invitations/schema';

export const run = workspaceMutation({
  args: { role: OrganizationInvitationValidators.role },
  returns: OrganizationInvitationValidators.invitationCode,
  handler: (ctx, { role }) => OrganizationInvitations.create(ctx, ctx.workspace, role)
});
