import { expect, test } from 'vite-plus/test';
import { assertTrustedPublisher } from '#src/release/publisher';

const publisher = {
  isGitHubActions: true,
  repository: 'nicksan222/groam',
  ref: 'refs/heads/main',
  eventName: 'push',
  sha: 'a'.repeat(40)
};

test('allows only a trusted main push or manual release', () => {
  expect(() => assertTrustedPublisher(publisher)).not.toThrow();
  expect(() =>
    assertTrustedPublisher({ ...publisher, eventName: 'workflow_dispatch' })
  ).not.toThrow();
});

test.each([
  { ref: 'refs/heads/feature' },
  { ref: 'refs/heads/beta' },
  { ref: 'refs/tags/main' },
  { repository: 'someone/groam' },
  { eventName: 'pull_request' },
  { eventName: 'pull_request_target' },
  { eventName: 'workflow_run' },
  { isGitHubActions: false },
  { sha: '' }
])('fails closed before a command can publish: %j', (override) => {
  expect(() => assertTrustedPublisher({ ...publisher, ...override })).toThrow();
});
