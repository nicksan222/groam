import { afterEach, expect, test, vi } from 'vite-plus/test';
import { deliverAuthEmail, requiresVerifiedEmail } from './delivery';

const configuration = {
  accountId: '0123456789abcdef0123456789abcdef',
  apiToken: 'private',
  from: 'auth@example.com'
};
const message = { to: 'person@example.com', subject: 'Verify email', text: 'secret link' };

afterEach(() => vi.unstubAllGlobals());

test('requires email ownership on every hosted site, even when email keys are absent', () => {
  expect(requiresVerifiedEmail('https://app.groam.app')).toBe(true);
  expect(requiresVerifiedEmail('https://preview.workers.dev')).toBe(true);
  expect(requiresVerifiedEmail('http://localhost:5173')).toBe(false);
  expect(requiresVerifiedEmail('http://127.0.0.1:5173')).toBe(false);
});

test('sends using the Cloudflare outbound API and accepts queued delivery', async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      success: true,
      result: {
        delivered: [],
        queued: [message.to],
        permanent_bounces: []
      }
    })
  );
  vi.stubGlobal('fetch', fetch);
  await deliverAuthEmail(configuration, message);
  expect(fetch).toHaveBeenCalledWith(
    'https://api.cloudflare.com/client/v4/accounts/0123456789abcdef0123456789abcdef/email/sending/send',
    expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'Bearer private', 'content-type': 'application/json' },
      body: JSON.stringify({ ...message, from: configuration.from })
    })
  );
});

test.each([
  { success: false, errors: [{ message: 'private provider diagnostic' }] },
  { success: true, result: { delivered: [], queued: [], permanent_bounces: [message.to] } },
  { success: true, result: { delivered: [], queued: [], permanent_bounces: [] } },
  { unexpected: true }
])('rejects unsuccessful or unconfirmed deliveries without exposing secrets', async (body) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
  await expect(deliverAuthEmail(configuration, message)).rejects.toThrow(
    'Authentication email delivery failed'
  );
});

test('rejects malformed account paths before issuing an external request', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(
    deliverAuthEmail({ ...configuration, accountId: '../other?secret' }, message)
  ).rejects.toThrow('Invalid Cloudflare account ID');
  expect(fetch).not.toHaveBeenCalled();
});
