import { expect, test } from 'vite-plus/test';
import { betaTarget, productionTarget } from '#src/release/target-fixture';
import { frontendEnvironment } from '#src/void/environment';

test('Void deploys receive public destinations and no backend credentials', () => {
  const result = frontendEnvironment(productionTarget, {
    PATH: '/bin',
    CLOUDFLARE_API_TOKEN: 'for-void',
    CONVEX_DEPLOY_KEY: 'do-not-inherit',
    CONVEX_DEPLOYMENT: 'dev:local',
    BETTER_AUTH_SECRET: 'do-not-inherit',
    STRIPE_SECRET_KEY: 'do-not-inherit',
    VITE_CONVEX_URL: 'http://localhost:3210'
  });
  // Void keeps its Cloudflare credentials out of the builds it runs.
  expect(result.CLOUDFLARE_API_TOKEN).toBe('for-void');
  expect(result.CLOUDFLARE_ACCOUNT_ID).toBe(productionTarget.cloudflareAccountId);
  for (const key of [
    'CONVEX_DEPLOY_KEY',
    'CONVEX_DEPLOYMENT',
    'BETTER_AUTH_SECRET',
    'STRIPE_SECRET_KEY'
  ])
    expect(result[key]).toBeUndefined();
  expect(result).toMatchObject({
    GROAM_ENVIRONMENT: 'production',
    PATH: '/bin',
    VITE_CONVEX_URL: productionTarget.convexUrl,
    VITE_CONVEX_SITE_URL: productionTarget.backendSiteUrl,
    VITE_SITE_URL: 'https://app.groam.example',
    VITE_LANDING_URL: 'https://groam.example',
    LANDING_SITE_URL: 'https://groam.example/',
    CLOUDFLARE_WORKERS_SUBDOMAIN: 'groam'
  });
});

test('selects the environment and omits the account when the token reaches only one', () => {
  const result = frontendEnvironment(betaTarget, {});
  expect(result.GROAM_ENVIRONMENT).toBe('beta');
  // `my-team.workers.dev` is accepted and passed to Void as `my-team`.
  expect(result.CLOUDFLARE_WORKERS_SUBDOMAIN).toBe('groam-beta');
  expect(result).not.toHaveProperty('CLOUDFLARE_ACCOUNT_ID');
});
