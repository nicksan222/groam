import { ConvexHttpClient } from 'convex/browser';
import type { BackendSession } from './backend-session';
import type { AuthenticatedAppUser } from './ensure-user';
import { getConvexToken } from './get-convex-token';

export async function authenticatedClient(
  backend: BackendSession,
  user: AuthenticatedAppUser
): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(backend.config.convexUrl);
  client.setAuth(await getConvexToken(backend, user));
  return client;
}
