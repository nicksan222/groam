import { expectConsole } from '@groam/vitest-config/console';
import { expect, test, vi } from 'vite-plus/test';
import { createTest } from '#testing/factory';

vi.hoisted(() => {
  vi.stubEnv('SITE_URL', 'https://app.example.com');
});

const password = 'Safe-password-1234';

function post(test: ReturnType<typeof createTest>, path: string, body: object) {
  return test.fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { origin: 'https://app.example.com', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('hosted signup cannot create a session until email ownership is verified', async () => {
  const convex = createTest();
  const signup = await post(convex, 'sign-up/email', {
    email: 'new@example.com',
    name: 'New traveler',
    password
  });
  expect(signup.status).toBe(200);
  expect((await signup.json()).token).toBeNull();
  const login = await post(convex, 'sign-in/email', { email: 'new@example.com', password });
  expect(login.status).toBe(403);
  const scheduled = await convex.run(
    async (ctx) => await ctx.db.system.query('_scheduled_functions').take(10)
  );
  expect(scheduled.length).toBeGreaterThan(0);
  const text = scheduled[0]?.args[0]?.text;
  expect(typeof text).toBe('string');
  const verificationUrl = new URL(
    String(text).match(/https?:\/\/\S+/u)?.[0] ?? 'https://invalid.invalid'
  );
  const verified = await convex.fetch(verificationUrl.pathname + verificationUrl.search, {
    headers: { origin: 'https://app.example.com' }
  });
  expect(verified.status).toBe(302);
  const authenticated = await post(convex, 'sign-in/email', { email: 'new@example.com', password });
  expect(authenticated.status).toBe(200);
  const sessionToken = (await authenticated.json()).token;
  expect(sessionToken).toEqual(expect.any(String));
  const requested = await post(convex, 'request-password-reset', {
    email: 'new@example.com',
    redirectTo: 'https://app.example.com/app/'
  });
  expect(requested.status).toBe(200);
  const pending = await convex.run(
    async (ctx) => await ctx.db.system.query('_scheduled_functions').take(10)
  );
  const resetMail = pending.find((job) => job.args[0]?.subject === 'Reset your Groam password');
  const resetUrl = new URL(
    String(resetMail?.args[0]?.text).match(/https?:\/\/\S+/u)?.[0] ?? 'https://invalid.invalid'
  );
  const resetToken = resetUrl.pathname.split('/').at(-1);
  const reset = await post(convex, 'reset-password', {
    token: resetToken,
    newPassword: 'Changed-password-1234'
  });
  expect(reset.status).toBe(200);
  const replay = await post(convex, 'reset-password', {
    token: resetToken,
    newPassword: 'Stolen-password-1234'
  });
  expect(replay.status).toBe(400);
  const revoked = await convex.fetch('/api/auth/get-session', {
    headers: { origin: 'https://app.example.com', authorization: `Bearer ${sessionToken}` }
  });
  expect(await revoked.json()).toBeNull();
});

test('password reset is generic for unknown accounts and rejects forged tokens', async () => {
  const convex = createTest();
  expectConsole('warn', 'Reset Password: User not found');
  const unknown = await post(convex, 'request-password-reset', {
    email: 'unknown@example.com',
    redirectTo: 'https://app.example.com/app/'
  });
  expect(unknown.status).toBe(200);
  const forged = await post(convex, 'reset-password', {
    newPassword: password,
    token: 'forged-token'
  });
  expect(forged.status).toBe(400);
});

test.each(['email', 'username'])(
  'automatic verification on %s sign-in returns to the hosted app',
  async (identifier) => {
    const convex = createTest();
    const email = 'callback@example.com';
    const username = 'callbacktraveler';
    const callbackURL = 'https://app.example.com/app/';
    expect(
      (
        await post(convex, 'sign-up/email', {
          email,
          username,
          name: 'Callback traveler',
          password
        })
      ).status
    ).toBe(200);
    const login = await post(convex, `sign-in/${identifier}`, {
      ...(identifier === 'email' ? { email } : { username }),
      password,
      callbackURL
    });
    expect(login.status).toBe(403);
    const scheduled = await convex.run(
      async (ctx) => await ctx.db.system.query('_scheduled_functions').take(20)
    );
    const verificationURLs = scheduled.flatMap((job) => {
      const match = String(job.args[0]?.text).match(/https?:\/\/\S+/u)?.[0];
      return match ? [new URL(match)] : [];
    });
    const automaticMail = verificationURLs.find(
      (url) => url.searchParams.get('callbackURL') === callbackURL
    );
    expect(automaticMail).toBeDefined();
    const verified = await convex.fetch(automaticMail!.pathname + automaticMail!.search, {
      headers: { origin: 'https://app.example.com' }
    });
    expect(verified.status).toBe(302);
    expect(verified.headers.get('location')).toBe(callbackURL);
  }
);
