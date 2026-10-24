import { expect, test } from 'vite-plus/test';
import { missingVariables } from '#src/deployment/variables';

test('requires what you set yourself and leaves release-set values to the release', () => {
  expect(missingVariables('convex', new Set())).toEqual([]);
  expect(missingVariables('github', new Set())).toEqual(['CONVEX_DEPLOY_KEY']);
  expect(missingVariables('github', new Set(['CONVEX_DEPLOY_KEY']))).toEqual([]);
});

test('an optional value brings the values it requires', () => {
  expect(missingVariables('convex', new Set(['STRIPE_SECRET_KEY']))).toEqual([
    'STRIPE_WEBHOOK_SECRET'
  ]);
  expect(missingVariables('convex', new Set(['STRIPE_WEBHOOK_SECRET']))).toEqual([]);
});

test('authentication email needs no setup: without a Resend key it is logged', () => {
  expect(missingVariables('convex', new Set(['RESEND_API_KEY']))).toEqual([]);
});
