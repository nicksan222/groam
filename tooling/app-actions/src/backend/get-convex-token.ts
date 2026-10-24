import type { BackendSession } from './backend-session';
import { authRequest } from './better-auth-request';
import { asObject, assertResponse, requiredString, responseJson } from './better-auth-response';
import type { AuthenticatedAppUser } from './ensure-user';

export async function getConvexToken(
  backend: BackendSession,
  user: AuthenticatedAppUser
): Promise<string> {
  const response = await authRequest(
    backend,
    new URL('/api/auth/convex/token', backend.config.siteUrl),
    undefined,
    user.cookie
  );
  await assertResponse(response, `issue a Convex token for ${user.email}`);
  const body = asObject(await responseJson(response, 'Convex token'), 'Convex token');
  return requiredString(body.token, 'Convex token');
}
