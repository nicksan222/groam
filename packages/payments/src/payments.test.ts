import { afterEach, expect, test, vi } from 'vite-plus/test';
import { matchesPrice, paymentProvider, verifyStripeSignature } from './index';

const secret = 'whsec_fixture';
const payload = '{"type":"checkout.session.completed"}';

async function header(timestamp: number, key = secret) {
  const hmac = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const bytes = await crypto.subtle.sign(
    'HMAC',
    hmac,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  const hex = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

afterEach(() => vi.useRealTimers());

test('without complete Stripe credentials every traveler holds an already-paid pass', async () => {
  for (const stripe of [
    undefined,
    { secretKey: 'sk_test' },
    { secretKey: ' ', webhookSecret: 'x' }
  ]) {
    const provider = paymentProvider({ stripe });
    expect(provider).toMatchObject({ name: 'Pass', collects: false });
  }
  const pass = paymentProvider({});
  const price = { amount: 100, currency: 'eur' };
  const checkout = await pass.createCheckout({
    price,
    description: 'Seat',
    reference: 'payment-1',
    deployment: 'local',
    returnUrl: 'http://localhost/trip',
    idempotencyKey: 'key-1'
  });
  expect(checkout).toMatchObject({
    paid: true,
    status: 'complete',
    url: null,
    reference: 'payment-1'
  });
  expect(matchesPrice(checkout, price)).toBe(true);
  expect(await pass.completedCheckout(new Request('http://localhost'))).toBeNull();
});

test('complete Stripe credentials select the charging provider', () => {
  const provider = paymentProvider({ stripe: { secretKey: 'sk_test', webhookSecret: secret } });
  expect(provider).toMatchObject({ name: 'Stripe', collects: true });
});

test('Stripe signatures must match the payload, the secret, and a recent timestamp', async () => {
  vi.useFakeTimers();
  const now = Math.floor(Date.now() / 1000);
  await expect(verifyStripeSignature(payload, await header(now), secret)).resolves.toBeUndefined();
  await expect(
    verifyStripeSignature(payload, `${await header(now)},v1=deadbeef`, secret)
  ).resolves.toBeUndefined();
  await expect(
    verifyStripeSignature(payload, await header(now, 'whsec_wrong'), secret)
  ).rejects.toThrow('No signature matches');
  await expect(verifyStripeSignature(`${payload} `, await header(now), secret)).rejects.toThrow(
    'No signature matches'
  );
  await expect(verifyStripeSignature(payload, await header(now - 301), secret)).rejects.toThrow(
    'outside the tolerance'
  );
  await expect(verifyStripeSignature(payload, 'garbage', secret)).rejects.toThrow('Malformed');
});
