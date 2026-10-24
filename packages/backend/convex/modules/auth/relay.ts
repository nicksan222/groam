/**
 * Convex hands authentication mail to the Void Worker, which sends it with `void/email`. Both sides
 * share a secret; each request is signed over its timestamp and body so the Worker only sends mail
 * Convex asked for, and a captured request stops working after a few minutes.
 */
export const emailRelayPath = '/api/email';
export const emailRelayHeaders = {
  signature: 'x-groam-signature',
  timestamp: 'x-groam-timestamp'
} as const;

const maxAgeMs = 5 * 60 * 1000;
const encoder = new TextEncoder();

function relayKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    [usage]
  );
}

const toHex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

function fromHex(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/u.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1)
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

/** The signature header value for a relay request sent at `timestamp` (milliseconds). */
export async function signEmailRelay(secret: string, body: string, timestamp: number) {
  if (!secret) throw new Error('The email relay secret is not configured');
  const key = await relayKey(secret, 'sign');
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)));
}

/** Whether a relay request is fresh and signed with the shared secret (constant-time check). */
export async function verifyEmailRelay(
  secret: string,
  body: string,
  headers: { signature: string | undefined; timestamp: string | undefined },
  now = Date.now()
) {
  const timestamp = Number(headers.timestamp);
  const signature = fromHex(headers.signature ?? '');
  if (!secret || !signature || !Number.isSafeInteger(timestamp)) return false;
  if (Math.abs(now - timestamp) > maxAgeMs) return false;
  const key = await relayKey(secret, 'verify');
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(`${timestamp}.${body}`));
}
