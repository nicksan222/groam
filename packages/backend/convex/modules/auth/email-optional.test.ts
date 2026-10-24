import { expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { scheduledMail } from '#testing/auth/mail';
import { createTest } from '#testing/factory';

vi.hoisted(() => {
  vi.stubEnv('SITE_URL', 'https://app.example.com');
  vi.stubEnv('RESEND_API_KEY', '');
});

const password = 'Safe-password-1234';

function post(test: ReturnType<typeof createTest>, path: string, body: object) {
  return test.fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { origin: 'https://app.example.com', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('hosted without a Resend key signs up and in without email verification', async () => {
  const convex = createTest();
  const signup = await post(convex, 'sign-up/email', {
    email: 'nokey@example.com',
    name: 'No key traveler',
    password
  });
  expect(signup.status).toBe(200);
  expect((await signup.json()).token).toEqual(expect.any(String));
  const login = await post(convex, 'sign-in/email', { email: 'nokey@example.com', password });
  expect(login.status).toBe(200);
  expect(await scheduledMail(convex)).toEqual([]);
});

test('hosted without a Resend key refuses mail-dependent flows with a clear error', async () => {
  const convex = createTest();
  const reset = await post(convex, 'request-password-reset', {
    email: 'nokey@example.com',
    redirectTo: 'https://app.example.com/app/'
  });
  expect(reset.status).toBe(503);
  const verification = await post(convex, 'send-verification-email', {
    email: 'nokey@example.com'
  });
  expect(verification.status).toBe(503);
  expect(await scheduledMail(convex)).toEqual([]);
});

test('the public capability reflects whether a Resend key is set', async () => {
  const convex = createTest();
  expect(await convex.query(api.routes.auth.email.run, {})).toBe(false);
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  expect(await convex.query(api.routes.auth.email.run, {})).toBe(true);
  vi.stubEnv('RESEND_API_KEY', '');
});

test('a Resend key restores required verification on a hosted site', async () => {
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  const convex = createTest();
  const signup = await post(convex, 'sign-up/email', {
    email: 'withkey@example.com',
    name: 'Key traveler',
    password
  });
  expect(signup.status).toBe(200);
  expect((await signup.json()).token).toBeNull();
  const login = await post(convex, 'sign-in/email', { email: 'withkey@example.com', password });
  expect(login.status).toBe(403);
  vi.stubEnv('RESEND_API_KEY', '');
});
