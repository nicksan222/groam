import { agentRunCopy, agentRunEventLabels } from '@groam/ai-contracts/agents/runs/events';
import { RUN_STATUS_LABEL } from '@groam/ai-contracts/agents/runs/ids';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AgentRunBanner } from './agent-run-banner';

afterEach(cleanup);

test('shows live status, latest activity once, and a link to the agent', () => {
  const onStop = vi.fn();
  render(
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
  const banner = screen.getByTestId('issue-agent-banner');
  expect(banner).toBeTruthy();
  expect(banner.className).toContain('border-primary/25');
  expect(banner.className).not.toContain('mb-6');
  expect(screen.getByText('Issue agent')).toBeTruthy();
  expect(screen.getByText(RUN_STATUS_LABEL.running)).toBeTruthy();
  expect(screen.queryByText(RUN_STATUS_LABEL.running)?.closest('[data-slot="badge"]')).toBeNull();
  expect(screen.getAllByText('Started working')).toHaveLength(1);
  expect(screen.getByTestId('agent-event').textContent).toBe('Started working');
  expect(screen.getByRole('link', { name: agentRunCopy.viewAgent }).getAttribute('href')).toBe(
    '/agents/issue'
  );
  fireEvent.click(screen.getByRole('button', { name: agentRunCopy.stop }));
  expect(onStop).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: agentRunCopy.retryFromZero })).toBeNull();
});

test('shows only the latest run event as activity', () => {
  render(
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
  expect(screen.getAllByTestId('agent-event')).toHaveLength(1);
  expect(screen.queryByText('Started working')).toBeNull();
  expect(screen.queryByText('Step 0')).toBeNull();
  expect(screen.getByText('Step 5')).toBeTruthy();
});

test('presents failed provider credit errors once without repeating the event label', () => {
  render(
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
  expect(screen.getByText(RUN_STATUS_LABEL.failed)).toBeTruthy();
  expect(
    screen.getByText(
      'The model provider said: This request requires more credits, or fewer max_tokens.'
    )
  ).toBeTruthy();
  expect(screen.queryByText(agentRunEventLabels.runFailed)).toBeNull();
  expect(screen.queryByRole('button', { name: agentRunCopy.retryFromZero })).toBeNull();
});

test('retries from zero only when the issue run failed', () => {
  const onRetry = vi.fn();
  render(
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
  fireEvent.click(screen.getByRole('button', { name: agentRunCopy.retryFromZero }));
  expect(onRetry).toHaveBeenCalledOnce();
});
