import { expectConsole } from '@groam/vitest-config/console';
import { expect, test, vi } from 'vite-plus/test';
import { components, internal } from '#convex-generated/api';
import { createTest } from '#testing/factory';
import { DEFAULT_AUTH_EMAIL_FROM, queueAuthEmail } from './email';

const message = {
  to: 'person@example.com',
  subject: 'Verify your Groam email',
  text: 'Open https://app.example.com/verify?token=private-token'
};

test('without a Resend key a local site logs the message, not sends it, and nothing throws', async () => {
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubEnv('SITE_URL', 'http://localhost:5173');
  expectConsole('info', /person@example\.com[\s\S]*Verify your Groam email[\s\S]*private-token/);
  const convex = createTest();
  await expect(convex.mutation(internal.modules.auth.email.send, message)).resolves.toBeNull();
  await expect(convex.run((ctx) => queueAuthEmail(ctx, message))).resolves.toBeNull();
});

test('without a Resend key a hosted site logs no text and nothing throws', async () => {
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubEnv('SITE_URL', 'https://app.groam.app');
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  const convex = createTest();
  await expect(convex.mutation(internal.modules.auth.email.send, message)).resolves.toBeNull();
  expect(info).not.toHaveBeenCalled();
  expect(logged).toHaveBeenCalledTimes(1);
  const line = String(logged.mock.calls[0]?.[0]);
  expect(line).toContain('example.com');
  expect(line).not.toContain('private-token');
  expect(line).not.toContain('person@');
  logged.mockRestore();
  info.mockRestore();
});

test('cleanup schedules both component cleanups', async () => {
  vi.useFakeTimers();
  const convex = createTest();
  await expect(convex.mutation(internal.modules.auth.email.cleanupResend, {})).resolves.toBeNull();
  await convex.finishAllScheduledFunctions(vi.runAllTimers);
  vi.useRealTimers();
});

test('with a Resend key the message is queued for real recipients from the configured sender', async () => {
  vi.stubEnv('RESEND_API_KEY', 're_private_key');
  vi.stubEnv('AUTH_EMAIL_FROM', 'Groam <hello@groam.example>');
  const convex = createTest();
  const emailId = await convex.run((ctx) => queueAuthEmail(ctx, message));
  if (!emailId) throw new Error('Expected the message to be queued');
  const queued = await convex.run((ctx) => ctx.runQuery(components.resend.lib.get, { emailId }));
  expect(queued).toMatchObject({
    from: 'Groam <hello@groam.example>',
    to: [message.to],
    subject: message.subject,
    text: message.text
  });
});

test('falls back to the shared sender when the release sets none', async () => {
  vi.stubEnv('RESEND_API_KEY', 're_private_key');
  vi.stubEnv('AUTH_EMAIL_FROM', '');
  const convex = createTest();
  const emailId = await convex.run((ctx) => queueAuthEmail(ctx, message));
  if (!emailId) throw new Error('Expected the message to be queued');
  const queued = await convex.run((ctx) => ctx.runQuery(components.resend.lib.get, { emailId }));
  expect(queued?.from).toBe(DEFAULT_AUTH_EMAIL_FROM);
});
