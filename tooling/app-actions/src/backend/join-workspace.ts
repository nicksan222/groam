import { api } from '@groam/backend/api';
import type { BackendSession } from './backend-session';
import { authenticatedClient } from './convex-client';
import type { AuthenticatedAppUser } from './ensure-user';
import type { AppWorkspace } from './ensure-workspace';

export async function joinWorkspace(
  backend: BackendSession,
  owner: AuthenticatedAppUser,
  member: AuthenticatedAppUser,
  _workspace: AppWorkspace,
  isMember: boolean
) {
  if (isMember) return 'existing' as const;

  const ownerClient = await authenticatedClient(backend, owner);
  const invitation = await ownerClient.mutation(api.routes.organizations.invitations.create.run, {
    role: 'member'
  });
  const memberClient = await authenticatedClient(backend, member);
  await memberClient.mutation(api.routes.organizations.invitations.redeem.run, {
    code: invitation.code
  });
  return 'joined' as const;
}
