import { expect, test } from 'vite-plus/test';
import { components } from '#convex-generated/api';
import { createTestAuthClient } from '#testing/auth/client';
import { mailLink, scheduledMail } from '#testing/auth/mail';
import { createAuthenticatedTest, createTestUser } from '#testing/factory';

type Fixture = Awaited<ReturnType<typeof createAuthenticatedTest>>;

async function requestChange({ authClient, test: convex }: Fixture) {
  expect((await authClient.changeEmail({ newEmail: 'real@example.com' })).error).toBeNull();
  const url = await mailLink(convex, (mail) => mail.to === 'real@example.com');
  expect(url.origin + url.pathname).toBe('http://127.0.0.1:3211/settings/profile');
  return url.searchParams.get('emailChangeToken')!;
}

test('only the authenticated originating account can consume a change-email link', async () => {
  const fixture = await createAuthenticatedTest({ email: 'old@example.com' });
  const { authClient, test: convex } = fixture;
  const token = await requestChange(fixture);
  expect(await scheduledMail(convex)).toContainEqual(
    expect.objectContaining({ to: 'old@example.com', subject: 'Your Groam email is changing' })
  );
  const anonymous = createTestAuthClient(convex).client;
  expect((await anonymous.verifyEmail({ query: { token } })).error).not.toBeNull();
  expect((await anonymous.getSession()).data).toBeNull();
  const wrongUser = await createTestUser(convex, { email: 'other@example.com' });
  expect((await wrongUser.authClient.verifyEmail({ query: { token } })).error).not.toBeNull();
  expect((await authClient.verifyEmail({ query: { token: 'malformed' } })).error).not.toBeNull();
  expect((await authClient.getSession()).data?.user.email).toBe('old@example.com');
  expect((await authClient.verifyEmail({ query: { token } })).error).toBeNull();
  const after = await authClient.getSession();
  expect(after.data?.user).toMatchObject({ email: 'real@example.com', emailVerified: true });
  // Reopening the used link reports the change as already confirmed.
  expect((await authClient.verifyEmail({ query: { token } })).error).toBeNull();
});

test('stale sessions can neither request nor consume email changes', async () => {
  const fixture = await createAuthenticatedTest();
  expect(
    (await fixture.authClient.changeEmail({ newEmail: 'new@users.invalid' })).error
  ).not.toBeNull();
  const token = await requestChange(fixture);
  const { data } = await fixture.authClient.getSession();
  await fixture.test.mutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: 'session',
      where: [{ field: 'token', value: data!.session.token }],
      update: { createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000 }
    }
  });
  expect((await fixture.authClient.verifyEmail({ query: { token } })).error).not.toBeNull();
  const mailCount = (await scheduledMail(fixture.test)).length;
  expect(
    (await fixture.authClient.changeEmail({ newEmail: 'other@example.com' })).error
  ).not.toBeNull();
  expect(await scheduledMail(fixture.test)).toHaveLength(mailCount);
  expect((await fixture.authClient.getSession()).data?.user.email).toBe('person@example.com');
});

test('placeholder accounts recover by confirming a real address', async () => {
  const fixture = await createAuthenticatedTest();
  await fixture.test.mutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: 'user',
      where: [{ field: '_id', value: fixture.userId }],
      update: { email: 'x@users.invalid', emailVerified: false }
    }
  });
  const token = await requestChange(fixture);
  expect((await scheduledMail(fixture.test)).map((mail) => mail.to)).not.toContain(
    'x@users.invalid'
  );
  expect((await fixture.authClient.verifyEmail({ query: { token } })).error).toBeNull();
  expect((await fixture.authClient.getSession()).data?.user).toMatchObject({
    email: 'real@example.com',
    emailVerified: true
  });
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
