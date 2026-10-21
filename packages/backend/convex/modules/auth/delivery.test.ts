import { afterEach, expect, test, vi } from 'vite-plus/test';
import { deliverAuthEmail, requiresVerifiedEmail } from './delivery';
import { emailRelayHeaders, verifyEmailRelay } from './relay';

const configuration = { siteUrl: 'https://groam.example', relaySecret: 'private' };
const message = { to: 'person@example.com', subject: 'Verify email', text: 'secret link' };

afterEach(() => vi.unstubAllGlobals());

test('requires email ownership on every hosted site, even when email keys are absent', () => {
  expect(requiresVerifiedEmail('https://app.groam.app')).toBe(true);
  expect(requiresVerifiedEmail('https://preview.workers.dev')).toBe(true);
  expect(requiresVerifiedEmail('http://localhost:5173')).toBe(false);
  expect(requiresVerifiedEmail('http://127.0.0.1:5173')).toBe(false);
});

test('hands the message to the Void Worker with a signature over its body', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetch);
  await deliverAuthEmail(configuration, message);
  expect(fetch).toHaveBeenCalledWith(
    'https://groam.example/api/email',
    expect.objectContaining({
      method: 'POST',
      redirect: 'error',
      body: JSON.stringify(message)
    })
  );
  const [, init] = fetch.mock.calls[0] as [
    string,
    RequestInit & { headers: Record<string, string> }
  ];
  await expect(
    verifyEmailRelay(configuration.relaySecret, String(init.body), {
      signature: init.headers[emailRelayHeaders.signature],
      timestamp: init.headers[emailRelayHeaders.timestamp]
    })
  ).resolves.toBe(true);
});

test.each([
  () => Response.json({ error: 'private provider diagnostic' }, { status: 502 }),
  () => Response.json({ error: 'unauthorized' }, { status: 401 }),
  () => Response.json({ ok: false }),
  () => new Response('not json')
])('rejects unsuccessful or unconfirmed deliveries without exposing details', async (respond) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond()));
  await expect(deliverAuthEmail(configuration, message)).rejects.toThrow(
    'Authentication email delivery failed'
  );
});
