import type { BackendSession } from './backend-session';
import { authRequest, postRequired } from './better-auth-request';
import { asObject, assertResponse, requiredString, responseJson } from './better-auth-response';
import type { AuthenticatedAppUser } from './ensure-user';
import type { AppWorkspace } from './ensure-workspace';

export async function joinWorkspace(
  backend: BackendSession,
  owner: AuthenticatedAppUser,
  member: AuthenticatedAppUser,
  workspace: AppWorkspace,
  isMember: boolean
) {
  if (isMember) return 'existing' as const;

  const authUrl = new URL('/api/auth/', backend.config.siteUrl);
  const invitationResponse = await authRequest(
    backend,
    new URL('organization/invite-member', authUrl),
    {
      email: member.email,
      organizationId: workspace.organizationId,
      resend: true,
      role: 'member'
    },
    owner.cookie
  );
  await assertResponse(invitationResponse, `invite ${member.email}`);
  const invitation = asObject(await responseJson(invitationResponse, 'invitation'), 'invitation');
  await postRequired(
    backend,
    new URL('organization/accept-invitation', authUrl),
    { invitationId: requiredString(invitation.id, 'invitation id') },
    member.cookie,
    `accept the invitation for ${member.email}`
  );
  return 'joined' as const;
}
