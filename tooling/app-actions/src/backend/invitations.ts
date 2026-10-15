import { api } from '@groam/backend/api';
import type { BackendActor } from './add-idea';
import { authenticatedClient } from './convex-client';

/** Creates a one-time code that lets someone join the user's active group. */
export async function createInvitation(
  { backend, user }: BackendActor,
  role: 'admin' | 'member' = 'member'
): Promise<string> {
  const client = await authenticatedClient(backend, user);
  const invitation = await client.mutation(api.routes.organizations.invitations.create.run, {
    role
  });
  return invitation.code;
}

/** Joins the group an invitation code belongs to. */
export async function redeemInvitation(
  { backend, user }: BackendActor,
  code: string
): Promise<void> {
  const client = await authenticatedClient(backend, user);
  await client.mutation(api.routes.organizations.invitations.redeem.run, { code });
}
