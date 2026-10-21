import { describe, expect, test } from 'vite-plus/test';
import { assertTrustedPublisher } from '#src/release/publisher';
import { betaTarget, productionTarget } from '#src/release/target-fixture';

const publisher = {
  isGitHubActions: true,
  repository: 'nicksan222/groam',
  ref: 'refs/heads/main',
  eventName: 'push',
  sha: 'a'.repeat(40),
  keyDeploymentName: 'groam-demo',
  hasCloudflareToken: true
};

describe('production publisher', () => {
  test('allows only a trusted main push or manual release with the matching key', () => {
    expect(() => assertTrustedPublisher(productionTarget, publisher)).not.toThrow();
    expect(() =>
      assertTrustedPublisher(productionTarget, { ...publisher, eventName: 'workflow_dispatch' })
    ).not.toThrow();
  });

  test.each([
    { ref: 'refs/heads/feature' },
    { ref: 'refs/tags/main' },
    { repository: 'someone/groam' },
    { eventName: 'pull_request' },
    { eventName: 'pull_request_target' },
    { eventName: 'workflow_run' },
    { isGitHubActions: false },
    { keyDeploymentName: null },
    { keyDeploymentName: 'other' },
    { sha: '' },
    { hasCloudflareToken: false }
  ])('fails closed before a command can publish: %j', (override) => {
    expect(() => assertTrustedPublisher(productionTarget, { ...publisher, ...override })).toThrow();
  });
});

test('beta requires a manual trusted main release and its own backend key', () => {
  const betaPublisher = {
    ...publisher,
    eventName: 'workflow_dispatch',
    keyDeploymentName: 'groam-beta'
  };
  expect(() => assertTrustedPublisher(betaTarget, betaPublisher)).not.toThrow();
  for (const override of [
    { eventName: 'push' },
    { eventName: 'pull_request' },
    { ref: 'refs/heads/beta' },
    { keyDeploymentName: productionTarget.deploymentName }
  ])
    expect(() => assertTrustedPublisher(betaTarget, { ...betaPublisher, ...override })).toThrow();
});
