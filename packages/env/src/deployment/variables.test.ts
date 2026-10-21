import { expect, test } from 'vite-plus/test';
import { missingVariables, schemaFor, variableNames } from '#src/deployment/variables';

test('requires what you set yourself and leaves release-set values to the release', () => {
  expect(missingVariables('convex', new Set())).toEqual(['AUTH_EMAIL_RELAY_SECRET']);
  expect(missingVariables('convex', new Set(['AUTH_EMAIL_RELAY_SECRET']))).toEqual([]);
  expect(missingVariables('github', new Set(['CONVEX_DEPLOY_KEY']))).toEqual([
    'CLOUDFLARE_API_TOKEN'
  ]);
});

test('an optional value brings the values it requires', () => {
  expect(
    missingVariables('convex', new Set(['AUTH_EMAIL_RELAY_SECRET', 'STRIPE_SECRET_KEY']))
  ).toEqual(['STRIPE_WEBHOOK_SECRET']);
  expect(
    missingVariables('convex', new Set(['AUTH_EMAIL_RELAY_SECRET', 'STRIPE_WEBHOOK_SECRET']))
  ).toEqual([]);
});

test('builds one schema entry per variable', () => {
  expect(Object.keys(schemaFor('worker', () => 'string'))).toEqual(variableNames('worker'));
});
