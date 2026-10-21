import { expect, test } from 'vite-plus/test';
import { components } from '#convex-generated/api';
import { createTestAuthClient } from '#testing/auth/client';
import { createAuthenticatedTest, createTestUser } from '#testing/factory';

async function requestChange(fixture: Awaited<ReturnType<typeof createAuthenticatedTest>>) {
  const requested = await fixture.authClient.changeEmail({
    newEmail: 'real@example.com',
    callbackURL: 'http://127.0.0.1:3211/settings/profile'
  });
  expect(requested.error).toBeNull();
  const scheduled = await fixture.test.run(
    async (ctx) => await ctx.db.system.query('_scheduled_functions').take(10)
  );
  const mail = scheduled.find((job) => job.args[0]?.to === 'real@example.com');
  const url = new URL(
    String(mail?.args[0]?.text).match(/https?:\/\/\S+/u)?.[0] ?? 'https://invalid.invalid'
  );
  expect(url.origin).toBe('http://127.0.0.1:3211');
  expect(url.pathname).toBe('/settings/profile');
  return url.searchParams.get('emailChangeToken')!;
}

test('only the authenticated originating account can consume a change-email verification link', async () => {
  const fixture = await createAuthenticatedTest({ email: 'old@example.com' });
  const { authClient, test: convex } = fixture;
  const token = await requestChange(fixture);
  const anonymous = createTestAuthClient(convex).client;
  expect((await anonymous.verifyEmail({ query: { token } })).error).not.toBeNull();
  expect((await anonymous.getSession()).data).toBeNull();
  const wrongUser = await createTestUser(convex, { email: 'other@example.com' });
  expect((await wrongUser.authClient.verifyEmail({ query: { token } })).error).not.toBeNull();
  expect((await authClient.getSession()).data?.user.email).toBe('old@example.com');
  expect((await authClient.verifyEmail({ query: { token } })).error).toBeNull();
  const after = await authClient.getSession();
  expect(after.data?.user.email).toBe('real@example.com');
  expect(after.data?.user.emailVerified).toBe(true);
});

test('stale sessions cannot consume change-email links and placeholder addresses cannot be requested', async () => {
  const fixture = await createAuthenticatedTest();
  expect(
    (await fixture.authClient.changeEmail({ newEmail: 'new@users.invalid' })).error
  ).not.toBeNull();
  const token = await requestChange(fixture);
  const current = await fixture.authClient.getSession();
  await fixture.test.mutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: 'session',
      where: [{ field: 'token', value: current.data!.session.token }],
      update: { createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 }
    }
  });
  expect((await fixture.authClient.verifyEmail({ query: { token } })).error).not.toBeNull();
  expect((await fixture.authClient.getSession()).data?.user.email).toBe('person@example.com');
});

test('cross-domain cookie transport can confirm a change without an Authorization header', async () => {
  const fixture = await createAuthenticatedTest();
  let verifiedWithCookie = false;
  const browser = createTestAuthClient({
    fetch: async (path, init) => {
      if (path.startsWith('/api/auth/verify-email')) {
        const headers = new Headers(init?.headers);
        expect(headers.has('authorization')).toBe(false);
        expect(headers.get('better-auth-cookie')).toEqual(
          expect.stringContaining('session_token=')
        );
        verifiedWithCookie = true;
      }
      return fixture.test.fetch(path, init);
    }
  }).client;
  expect(
    (await browser.signIn.email({ email: 'person@example.com', password: 'Test-password-1234' }))
      .error
  ).toBeNull();
  const token = await requestChange({ ...fixture, authClient: browser });
  expect((await browser.verifyEmail({ query: { token } })).error).toBeNull();
  expect(verifiedWithCookie).toBe(true);
  expect((await browser.getSession()).data?.user.email).toBe('real@example.com');
});

test('malformed and expired email-change tokens cannot mutate the account', async () => {
  const fixture = await createAuthenticatedTest();
  const token = await requestChange(fixture);
  expect(
    (await fixture.authClient.verifyEmail({ query: { token: 'malformed-token' } })).error
  ).not.toBeNull();
  // Tokens expire in one hour; the originating session remains fresh for a day.
  const { vi } = await import('vite-plus/test');
  vi.useFakeTimers();
  try {
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    expect((await fixture.authClient.verifyEmail({ query: { token } })).error).not.toBeNull();
    expect((await fixture.authClient.getSession()).data?.user.email).toBe('person@example.com');
  } finally {
    vi.useRealTimers();
  }
});

test('public profile updates cannot forge verified email ownership', async () => {
  const fixture = await createAuthenticatedTest();
  const session = await fixture.authClient.getSession();
  await fixture.test.mutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: 'user',
      where: [{ field: '_id', value: fixture.userId }],
      update: { emailVerified: false }
    }
  });
  await fixture.test.fetch('/api/auth/update-user', {
    method: 'POST',
    headers: {
      origin: 'http://127.0.0.1:3211',
      'content-type': 'application/json',
      authorization: `Bearer ${session.data!.session.token}`
    },
    body: JSON.stringify({ emailVerified: true })
  });
  const user = await fixture.test.query(components.betterAuth.adapter.findOne, {
    model: 'user',
    where: [{ field: '_id', value: fixture.userId }]
  });
  expect(user).toMatchObject({ emailVerified: false });
});
