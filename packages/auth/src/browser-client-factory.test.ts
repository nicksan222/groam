import { afterEach, expect, test, vi } from 'vitest';
import { createGroamBrowserAuthClient } from './browser-client-factory';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

test('cross-domain client sends its stored Better Auth cookie to the Convex site', async () => {
  localStorage.setItem(
    'better-auth_cookie',
    JSON.stringify({
      'better-auth.session_token': { expires: null, value: 'session-token' }
    })
  );
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify({ session: { id: 'session-a' }, user: { id: 'user-a' } }), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  const client = createGroamBrowserAuthClient('https://auth.example.com');

  await expect(client.getSession()).resolves.toMatchObject({
    data: { session: { id: 'session-a' }, user: { id: 'user-a' } },
    error: null
  });

  const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
  expect(requestUrl).toBeInstanceOf(URL);
  if (!(requestUrl instanceof URL)) throw new Error('Expected Better Auth to request a URL');
  expect(requestUrl.href).toBe('https://auth.example.com/api/auth/get-session');
  const headers = new Headers(requestInit?.headers);
  expect(headers.get('Better-Auth-Cookie')).toBe('better-auth.session_token=session-token');
  expect(requestInit?.credentials).toBe('omit');
});
