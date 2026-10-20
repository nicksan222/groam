import { afterEach, expect, test, vi } from 'vite-plus/test';
import { createGroamAuthClient } from './client-factory';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

test.each(['email', 'username'] as const)(
  'successful %s sign-in keeps the SPA document and stores its cross-domain session',
  async (identifier) => {
    const documentURL = window.location.href;
    // A hash destination catches an accidental default redirect without destroying the runner.
    const callbackURL = new URL(documentURL);
    callbackURL.hash = `unexpected-auth-navigation-${identifier}`;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (String(input).includes('/get-session')) {
        return Response.json({ session: { id: 'session-a' }, user: { id: 'user-a' } });
      }
      return new Response(
        JSON.stringify({
          redirect: true,
          url: callbackURL.href,
          token: 'session-token',
          user: { id: 'user-a', email: 'person@example.com', name: 'Traveler' }
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Set-Better-Auth-Cookie': 'better-auth.session_token=session-token; Path=/; HttpOnly'
          }
        }
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = createGroamAuthClient('https://auth.example.com');
    const credentials = { callbackURL: callbackURL.href, password: 'Safe-password-1234' };
    const response =
      identifier === 'email'
        ? await client.signIn.email({ ...credentials, email: 'person@example.com' })
        : await client.signIn.username({ ...credentials, username: 'traveler' });
    expect(response.error).toBeNull();
    expect(response.data).toMatchObject({ redirect: true, url: callbackURL.href });
    expect(window.location.href).toBe(documentURL);
    expect(client.getCookie()).toBe('better-auth.session_token=session-token');
    await client.getSession();
    const sessionRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/get-session')
    );
    expect(new Headers(sessionRequest?.[1]?.headers).get('Better-Auth-Cookie')).toBe(
      'better-auth.session_token=session-token'
    );
    expect(sessionRequest?.[1]?.credentials).toBe('omit');
    const request = fetchMock.mock.calls.find(([url]) =>
      String(url).includes(`/sign-in/${identifier}`)
    );
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ callbackURL: callbackURL.href });
  }
);
