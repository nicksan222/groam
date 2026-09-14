import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBackendActions } from './backend-app-actions';
import {
  backendConfig,
  jsonResponse,
  requestBody,
  requestUrl,
  testEmail,
  testPassword
} from './backend-test-fixtures';

const profile = { email: testEmail, name: 'Groam Demo', password: testPassword };

afterEach(() => vi.unstubAllGlobals());

describe('ensureUser', () => {
  test('creates a named user and retains its authenticated session', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { user: { id: 'user-a' } },
          200,
          'better-auth.session_token=token-a; Path=/; HttpOnly'
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createBackendActions(backendConfig).ensureUser(profile)).resolves.toMatchObject({
      cookie: 'better-auth.session_token=token-a',
      status: 'created',
      userId: 'user-a'
    });
    expect(requestUrl(fetchMock.mock.calls[0]?.[0])).toBe(
      'http://127.0.0.1:3215/api/auth/sign-up/email'
    );
    expect(requestBody(fetchMock.mock.calls[0])).toMatchObject({ name: 'Groam Demo' });
  });

  test('signs in an existing user', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'already exists' }, 422))
      .mockResolvedValueOnce(
        jsonResponse({ user: { id: 'user-a' } }, 200, 'better-auth.session_token=token-b; Path=/')
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createBackendActions(backendConfig).ensureUser(profile)).resolves.toMatchObject({
      status: 'existing',
      userId: 'user-a'
    });
    expect(requestUrl(fetchMock.mock.calls[1]?.[0])).toBe(
      'http://127.0.0.1:3215/api/auth/sign-in/email'
    );
  });

  test('fails clearly when neither signup nor signin establishes a session', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ message: 'already exists' }, 422))
        .mockResolvedValueOnce(jsonResponse({ message: 'invalid password' }, 401))
    );

    await expect(createBackendActions(backendConfig).ensureUser(profile)).rejects.toThrow(
      `Unable to create or verify ${testEmail} (422/401)`
    );
  });

  test('treats a 409 sign-up conflict as an existing user', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'already exists' }, 409))
      .mockResolvedValueOnce(
        jsonResponse({ user: { id: 'user-a' } }, 200, 'better-auth.session_token=token-c; Path=/')
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createBackendActions(backendConfig).ensureUser(profile)).resolves.toMatchObject({
      status: 'existing',
      userId: 'user-a'
    });
    expect(requestUrl(fetchMock.mock.calls[1]?.[0])).toBe(
      'http://127.0.0.1:3215/api/auth/sign-in/email'
    );
  });

  test('fails fast when sign-up returns a server error', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'unavailable' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createBackendActions(backendConfig).ensureUser(profile)).rejects.toThrow(
      `Unable to create ${testEmail} (500): {"message":"unavailable"}`
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test('fails fast when sign-up is unauthorized', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createBackendActions(backendConfig).ensureUser(profile)).rejects.toThrow(
      `Unable to create ${testEmail} (401)`
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test('fails fast when Better Auth is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('fetch failed'))
    );

    await expect(createBackendActions(backendConfig).ensureUser(profile)).rejects.toThrow(
      'Unable to reach Better Auth at http://127.0.0.1:3215: fetch failed'
    );
  });
});
