import { version } from 'convex';
import { assertLocalDevelopmentUrl } from './backend-session';
import type { LocalConvexCredentials } from './read-local-convex-credentials';

const UDF_FAILED = 560;

function adminHeaders(adminKey: string, contentType: string): Headers {
  const headers = new Headers();
  headers.set('Authorization', `Convex ${adminKey}`);
  headers.set('Convex-Client', `npm-cli-${version}`);
  headers.set('Content-Type', contentType);
  return headers;
}

async function readJson(response: Response, path: string): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Local Convex ${path} returned invalid JSON`);
  }
}

export async function localConvexAdminJson(
  credentials: LocalConvexCredentials,
  path: string,
  init: RequestInit,
  contentType = 'application/json'
): Promise<unknown> {
  const url = new URL(path, credentials.url);
  assertLocalDevelopmentUrl(url.origin, 'Local Convex admin URL');
  // fallow-ignore-next-line security-sink -- credentials are read from local config and both origins are restricted to localhost
  const response = await fetch(url, {
    ...init,
    headers: adminHeaders(credentials.adminKey, contentType)
  });
  if (!response.ok && response.status !== UDF_FAILED) {
    const detail = (await response.text()).trim().slice(0, 500);
    throw new Error(
      `Local Convex ${path} failed (${response.status})${detail ? `: ${detail}` : ''}`
    );
  }
  return await readJson(response, path);
}

export async function localConvexAdminQuery(
  credentials: LocalConvexCredentials,
  path: string,
  componentPath: string | undefined,
  args: Record<string, string>
): Promise<unknown> {
  const body = await localConvexAdminJson(credentials, '/api/query', {
    body: JSON.stringify({
      args: [args],
      componentPath,
      format: 'convex_encoded_json',
      path
    }),
    method: 'POST'
  });
  if (typeof body !== 'object' || body === null) {
    throw new Error(`Local Convex ${path} returned an invalid result`);
  }
  if ('status' in body && body.status === 'success' && 'value' in body) return body.value;
  const message =
    'errorMessage' in body && typeof body.errorMessage === 'string'
      ? body.errorMessage
      : `Local Convex ${path} failed`;
  throw new Error(message);
}
