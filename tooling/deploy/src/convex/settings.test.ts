import { expect, test } from 'vite-plus/test';
import { assertPaymentEnvironment } from '#src/convex/settings';

test('allows no-key payment bypass and requires webhook configuration when Stripe is enabled', () => {
  expect(() => assertPaymentEnvironment(new Set())).not.toThrow();
  expect(() => assertPaymentEnvironment(new Set(['STRIPE_WEBHOOK_SECRET']))).not.toThrow();
  expect(() => assertPaymentEnvironment(new Set(['STRIPE_SECRET_KEY']))).toThrow(
    'STRIPE_WEBHOOK_SECRET'
  );
  expect(() =>
    assertPaymentEnvironment(new Set(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']))
  ).not.toThrow();
});
