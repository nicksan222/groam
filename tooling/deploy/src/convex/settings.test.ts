import { expect, test } from 'vite-plus/test';
import { assertBackendSecrets } from '#src/convex/settings';

test('requires every secret the setup checklist marks as yours', () => {
  expect(() => assertBackendSecrets(new Set(['A']), ['A'])).not.toThrow();
  expect(() => assertBackendSecrets(new Set(), ['A', 'B'])).toThrow('A, B');
});

test('allows no-key payment bypass and requires webhook configuration when Stripe is enabled', () => {
  expect(() => assertBackendSecrets(new Set(), [])).not.toThrow();
  expect(() => assertBackendSecrets(new Set(['STRIPE_WEBHOOK_SECRET']), [])).not.toThrow();
  expect(() => assertBackendSecrets(new Set(['STRIPE_SECRET_KEY']), [])).toThrow(
    'STRIPE_WEBHOOK_SECRET'
  );
  expect(() =>
    assertBackendSecrets(new Set(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']), [])
  ).not.toThrow();
});
