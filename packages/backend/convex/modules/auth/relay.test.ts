import { expect, test } from 'vite-plus/test';
import { signEmailRelay, verifyEmailRelay } from './relay';

const secret = 'relay-secret';
const body = JSON.stringify({ subject: 'Verify', text: 'link', to: 'person@example.com' });
const now = 1_800_000_000_000;

test('accepts a fresh request signed with the shared secret', async () => {
  const signature = await signEmailRelay(secret, body, now);
  await expect(
    verifyEmailRelay(secret, body, { signature, timestamp: String(now) }, now + 1000)
  ).resolves.toBe(true);
});

test.each([
  ['another secret', 'other-secret', body, 0],
  ['a changed body', secret, body.replace('person', 'attacker'), 0],
  ['an expired request', secret, body, 6 * 60 * 1000],
  ['a request from the future', secret, body, -6 * 60 * 1000]
])('rejects %s', async (_, verifySecret, verifyBody, skew) => {
  const signature = await signEmailRelay(secret, body, now);
  await expect(
    verifyEmailRelay(verifySecret, verifyBody, { signature, timestamp: String(now) }, now + skew)
  ).resolves.toBe(false);
});

test.each([
  { signature: undefined, timestamp: String(now) },
  { signature: 'not-hex', timestamp: String(now) },
  { signature: 'ab', timestamp: 'soon' }
])('rejects malformed headers: %j', async (headers) => {
  await expect(verifyEmailRelay(secret, body, headers, now)).resolves.toBe(false);
});

test('never signs or accepts requests when the secret is missing', async () => {
  await expect(signEmailRelay('', body, now)).rejects.toThrow('not configured');
  const signature = await signEmailRelay(secret, body, now);
  await expect(
    verifyEmailRelay('', body, { signature, timestamp: String(now) }, now)
  ).resolves.toBe(false);
});
