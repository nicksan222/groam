import { expect, test } from 'vitest';
import { presentAgentRunMessage } from './copy';
import { agentRunCopy, agentRunEventLabels } from './events';

test('maps failed provider credit errors to shared assistant copy', () => {
  expect(
    presentAgentRunMessage({
      error: 'This request requires more credits, or fewer max_tokens.',
      headline: 'Run failed',
      status: 'failed'
    })
  ).toBe('The model provider said: This request requires more credits, or fewer max_tokens.');
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
