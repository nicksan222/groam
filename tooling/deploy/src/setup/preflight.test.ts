import { expect, test, vi } from 'vite-plus/test';
import { preflightProblems } from '#src/setup/preflight';

vi.mock('@groam/env/production', () => ({
  env: { githubSecrets: new Set(), keyDeploymentName: null, cloudflareApiToken: () => '' }
}));

test('invalid settings are the only problem until they are fixed', async () => {
  expect(
    await preflightProblems(() => {
      throw new Error('Set convexUrl first.');
    })
  ).toEqual(['Environment settings: Set convexUrl first.']);
});
