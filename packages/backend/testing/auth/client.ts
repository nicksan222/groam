import { createGroamAuthPlugins } from '@groam/auth/client-plugins';
import { createAuthClient } from 'better-auth/client';

const AUTH_ORIGIN = 'http://127.0.0.1:3211';

export type AuthHttpClient = {
  fetch(pathQueryFragment: string, init?: RequestInit): Promise<Response>;
};

export function createTestAuthClient(http: AuthHttpClient) {
  const storage = new Map<string, string>();
  let sessionToken: string | null = null;
  const customFetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const headers = new Headers(request.headers);
    headers.set('origin', AUTH_ORIGIN);
    if (sessionToken) headers.set('authorization', `Bearer ${sessionToken}`);

    const url = new URL(request.url);
    return await http.fetch(`${url.pathname}${url.search}`, {
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await request.arrayBuffer(),
      headers,
      method: request.method
    });
  };
  const client = createAuthClient({
    baseURL: AUTH_ORIGIN,
    fetchOptions: { customFetchImpl },
    plugins: [
      ...createGroamAuthPlugins({
        crossDomain: {
          storage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value)
          }
        }
      })
    ]
  });

  return {
    client,
    setSessionToken: (token: string) => {
      sessionToken = token;
    }
  };
}
