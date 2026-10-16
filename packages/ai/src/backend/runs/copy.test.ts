import { expect, test } from 'vite-plus/test';
import { presentAgentRunMessage } from './copy';
import { agentRunCopy, agentRunEventLabels } from './events';

test('maps ChatGPT usage limits to shared assistant copy', () => {
  expect(
    presentAgentRunMessage({
      error: 'subscription_sharing_usage_limit_exceeded',
      headline: 'Run failed',
      status: 'failed'
    })
  ).toBe(
    'ChatGPT usage limit reached for this app. Review your limits in ChatGPT Settings → Usage before trying again.'
  );
});

test('keeps a live headline when the run is still working', () => {
  expect(
    presentAgentRunMessage({
      error: null,
      headline: 'Started working',
      status: 'running'
    })
  ).toBe('Started working');
});

test('falls back to queued issue copy when there is no headline', () => {
  expect(
    presentAgentRunMessage({
      error: null,
      headline: null,
      status: 'queued'
    })
  ).toBe(agentRunCopy.issueQueued);
});

test('uses the shared failed-run label when no error text is stored', () => {
  expect(
    presentAgentRunMessage({
      error: null,
      headline: null,
      status: 'failed'
    })
  ).toBe(agentRunEventLabels.runFailed);
});
