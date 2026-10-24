import type { BackendSession } from './backend-session';
import { authRequest } from './better-auth-request';
import { asObject, assertResponse, requiredString, responseJson } from './better-auth-response';
import type { AuthenticatedAppUser } from './ensure-user';

const MEMBER_PAGE_SIZE = 100;

export function listWorkspaceMemberIds(
  backend: BackendSession,
  owner: AuthenticatedAppUser,
  organizationId: string
) {
  return listMemberIds(backend, owner, organizationId);
}

async function listMemberIds(
  backend: BackendSession,
  owner: AuthenticatedAppUser,
  organizationId: string
): Promise<Set<string>> {
  const memberIds = new Set<string>();
  let offset = 0;
  while (true) {
    const url = new URL('/api/auth/organization/list-members', backend.config.siteUrl);
    url.searchParams.set('organizationId', organizationId);
    url.searchParams.set('limit', String(MEMBER_PAGE_SIZE));
    url.searchParams.set('offset', String(offset));
    const response = await authRequest(backend, url, undefined, owner.cookie);
    await assertResponse(response, 'list organization members');
    const body = asObject(await responseJson(response, 'member list'), 'member list');
    if (!Array.isArray(body.members)) {
      throw new Error('Better Auth returned an invalid member list');
    }
    for (const value of body.members) {
      const member = asObject(value, 'member');
      memberIds.add(requiredString(member.userId, 'member user id'));
    }
    const total = typeof body.total === 'number' ? body.total : undefined;
    offset += body.members.length;
    if (body.members.length < MEMBER_PAGE_SIZE) break;
    if (total !== undefined && offset >= total) break;
    if (body.members.length === 0) break;
  }
  return memberIds;
}
