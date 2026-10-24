import type { BackendSession } from './backend-session';
import type { AuthenticatedAppUser } from './ensure-user';
import type { AppWorkspace } from './ensure-workspace';
import { createInvitation, redeemInvitation } from './invitations';

export async function joinWorkspace(
  backend: BackendSession,
  {
    isMember,
    member,
    owner
  }: {
    isMember: boolean;
    member: AuthenticatedAppUser;
    owner: AuthenticatedAppUser;
    workspace: AppWorkspace;
  }
) {
  if (isMember) return 'existing' as const;

  const code = await createInvitation({ backend, user: owner });
  await redeemInvitation({ backend, user: member }, code);
  return 'joined' as const;
}
