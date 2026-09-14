import type { BackendSession } from './backend-session';
import { assertResponse } from './better-auth-response';

export async function authRequest(
  backend: BackendSession,
  url: URL,
  body?: Record<string, unknown>,
  cookie?: string
) {
  const siteOrigin = new URL(backend.config.siteUrl).origin;
  if (url.origin !== siteOrigin) {
    throw new Error('Better Auth request URL did not match the local Convex site');
  }
  try {
    // fallow-ignore-next-line security-sink -- BackendSession restricts siteUrl to localhost and the origin is rechecked above
    return await fetch(url, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        Origin: siteOrigin
      },
      method: body ? 'POST' : 'GET',
      redirect: 'error'
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error';
    throw new Error(`Unable to reach Better Auth at ${url.origin}: ${detail}`);
  }
}

export async function postRequired(
  backend: BackendSession,
  url: URL,
  body: Record<string, unknown>,
  cookie: string,
  operation: string
): Promise<void> {
  const response = await authRequest(backend, url, body, cookie);
  await assertResponse(response, operation);
}
