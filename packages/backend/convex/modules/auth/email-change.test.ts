import { expect, test } from 'vite-plus/test';
import { createTestAuthClient } from '#testing/auth/client';
import { createAuthenticatedTest } from '#testing/factory';

test('email changes require a session and proof of ownership of the new inbox', async () => {
  const { authClient, test: convex } = await createAuthenticatedTest({
    email: 'legacy@users.invalid'
  });
  const anonymous = createTestAuthClient(convex).client;
  const denied = await anonymous.changeEmail({ newEmail: 'attacker@example.com' });
  expect(denied.error).not.toBeNull();
  const requested = await authClient.changeEmail({ newEmail: 'real@example.com' });
  expect(requested.error).toBeNull();
  const before = await authClient.getSession();
  expect(before.data?.user.email).toBe('legacy@users.invalid');
  const scheduled = await convex.run(
    async (ctx) => await ctx.db.system.query('_scheduled_functions').take(10)
  );
  const mail = scheduled.find((job) => job.args[0]?.to === 'real@example.com');
  expect(mail).toBeDefined();
  const url = new URL(
    String(mail?.args[0]?.text).match(/https?:\/\/\S+/u)?.[0] ?? 'https://invalid.invalid'
  );
  const verified = await convex.fetch(url.pathname + url.search, {
    headers: { origin: 'http://127.0.0.1:3211' }
  });
  expect(verified.status).toBe(302);
  const after = await authClient.getSession();
  expect(after.data?.user.email).toBe('real@example.com');
  expect(after.data?.user.emailVerified).toBe(true);
});
