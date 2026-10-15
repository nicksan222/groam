import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { agentRunCopy, agentRunEventLabels } from '#ai/backend/runs/events';
import { RUN_STATUS_LABEL } from '#ai/backend/runs/ids';
import { AgentRunBanner } from './agent-run-banner';

test('shows live status, latest activity once, and a link to the agent', async () => {
  const onStop = vi.fn();
  await render(
    <AgentRunBanner
      agentLabel="Issue agent"
      eventTestId="agent-event"
      events={[{ id: 'event-1', label: 'Started working' }]}
      onStop={onStop}
      run={{ headline: 'Started working', id: 'run-1', issueId: 'issue-1', status: 'running' }}
      stopTestId="agent-stop"
      testId="issue-agent-banner"
      viewAgent={<a href="/agents/issue">{agentRunCopy.viewAgent}</a>}
    />
  );
  const banner = page.getByTestId('issue-agent-banner');
  await expect.element(banner).toHaveClass('border-primary/25');
  await expect.element(banner).not.toHaveClass('mb-6');
  await expect.element(page.getByText('Issue agent')).toBeInTheDocument();
  await expect.element(page.getByText(RUN_STATUS_LABEL.running)).toBeInTheDocument();
  expect(
    page.getByText(RUN_STATUS_LABEL.running).element().closest('[data-slot="badge"]')
  ).toBeNull();
  expect(page.getByText('Started working').elements()).toHaveLength(1);
  expect(page.getByTestId('agent-event').element().textContent).toBe('Started working');
  await expect
    .element(page.getByRole('link', { name: agentRunCopy.viewAgent }))
    .toHaveAttribute('href', '/agents/issue');
  await page.getByRole('button', { name: agentRunCopy.stop }).click();
  expect(onStop).toHaveBeenCalledOnce();
  await expect
    .element(page.getByRole('button', { name: agentRunCopy.retryFromZero }))
    .not.toBeInTheDocument();
});

test('shows only the latest run event as activity', async () => {
  await render(
    <AgentRunBanner
      agentLabel="Issue agent"
      eventTestId="agent-event"
      events={[0, 1, 2, 3, 4, 5].map((index) => ({
        id: `event-${index}`,
        label: `Step ${index}`
      }))}
      run={{ headline: 'Started working', id: 'run-1', issueId: 'issue-1', status: 'running' }}
      testId="issue-agent-banner"
      viewAgent={<a href="/agents/issue">{agentRunCopy.viewAgent}</a>}
    />
  );
  expect(page.getByTestId('agent-event').elements()).toHaveLength(1);
  await expect.element(page.getByText('Started working')).not.toBeInTheDocument();
  await expect.element(page.getByText('Step 0')).not.toBeInTheDocument();
  await expect.element(page.getByText('Step 5')).toBeInTheDocument();
});

test('presents failed provider credit errors once without repeating the event label', async () => {
  await render(
    <AgentRunBanner
      agentLabel="Issue agent"
      events={[{ id: 'event-fail', label: agentRunEventLabels.runFailed }]}
      run={{
        error: 'This request requires more credits, or fewer max_tokens.',
        headline: agentRunEventLabels.runFailed,
        id: 'run-1',
        issueId: 'issue-1',
        status: 'failed'
      }}
      testId="issue-agent-banner"
      viewAgent={<a href="/agents/issue">{agentRunCopy.viewAgent}</a>}
    />
  );
  await expect.element(page.getByText(RUN_STATUS_LABEL.failed)).toBeInTheDocument();
  expect(
    page
      .getByText(
        'The model provider said: This request requires more credits, or fewer max_tokens.'
      )
      .element()
  ).toBeTruthy();
  await expect.element(page.getByText(agentRunEventLabels.runFailed)).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: agentRunCopy.retryFromZero }))
    .not.toBeInTheDocument();
});

test('retries from zero only when the issue run failed', async () => {
  const onRetry = vi.fn();
  await render(
    <AgentRunBanner
      agentLabel="Issue agent"
      events={[]}
      onRetry={onRetry}
      retryTestId="agent-retry-from-zero"
      run={{
        error: 'This request requires more credits, or fewer max_tokens.',
        headline: agentRunEventLabels.runFailed,
        id: 'run-1',
        issueId: 'issue-1',
        status: 'failed'
      }}
      testId="issue-agent-banner"
      viewAgent={<a href="/agents/issue">{agentRunCopy.viewAgent}</a>}
    />
  );
  await page.getByRole('button', { name: agentRunCopy.retryFromZero }).click();
  expect(onRetry).toHaveBeenCalledOnce();
});
