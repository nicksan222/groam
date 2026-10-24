import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { AgentRunOutcome } from './agent-run-outcome';

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

function makeRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    agentId: 'issue',
    completedAt: null,
    createdBy: { name: 'Lea Ford', userId: 'user-1' },
    discussionId: null,
    error: null,
    headline: 'Started working',
    id: 'run-1',
    issueId: 'issue-1',
    kickoff: 'assign',
    proposalId: null,
    related: {
      chatTitle: null,
      ideaTitle: null,
      issueTitle: 'Rainy-day option',
      tripName: 'Lisbon'
    },
    report: null,
    shortId: null,
    startedAt: 1_700_000_000_000,
    status: 'running',
    surface: 'standalone',
    threadId: null,
    title: 'Rainy-day option',
    tripId: 'trip-1',
    updatedAt: 1_700_000_100_000,
    ...overrides
  } as unknown as AgentRun;
}

function renderOutcome(props: Parameters<typeof AgentRunOutcome>[0]) {
  return render(
    <ol>
      <AgentRunOutcome {...props} />
    </ol>
  );
}

describe('AgentRunOutcome', () => {
  test('omits the action footer for a completed research run with no available actions', async () => {
    await renderOutcome({
      onRetry: vi.fn(),
      run: makeRun({ agentId: 'researcher', issueId: null, status: 'complete' })
    });
    await expect.element(page.getByText('Run completed', { exact: true })).toBeVisible();
    expect(document.querySelector('[data-slot="timeline-card-actions"]')).toBeNull();
  });

  test.each([
    ['aborted', 'Run stopped', 'Activity recorded before it stopped is above.'],
    ['complete', 'Run completed', 'Results and activity are above.'],
    ['failed', 'Run failed', 'Check the error before retrying.'],
    ['queued', 'Queued', 'Activity appears when the run starts.'],
    ['running', 'Agent is working', 'Activity updates as the run progresses.']
  ] as const)('a %s run says "%s"', async (status, title, description) => {
    await renderOutcome({ run: makeRun({ status }) });
    await expect
      .element(
        page.getByRole('group', { name: 'Run outcome' }).or(page.getByLabelText('Run outcome'))
      )
      .toBeVisible();
    await expect.element(page.getByText(title, { exact: true })).toBeVisible();
    await expect.element(page.getByText(description)).toBeVisible();
  });

  test('shows the run error', async () => {
    await renderOutcome({ run: makeRun({ error: 'Network down', status: 'failed' }) });
    await expect.element(page.getByText(/Groam AI lost connection/u)).toBeVisible();
    await expect.element(page.getByText('Check the error before retrying.')).toBeVisible();
  });

  test.each([
    'Connect ChatGPT in Settings → AI to use your ChatGPT plan.',
    'Reconnect ChatGPT in Settings → AI to continue using your plan.',
    'chatgpt_reconnect',
    'refresh_token_expired',
    'Not authenticated',
    'Unauthorized'
  ])('treats "%s" as a ChatGPT connection problem', async (error) => {
    await renderOutcome({ onRetry: vi.fn(), run: makeRun({ error, status: 'failed' }) });
    await expect
      .element(page.getByText('Connect your ChatGPT account in AI settings.'))
      .toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'AI settings' }))
      .toHaveAttribute('href', '/settings/ai');
  });

  test('old provider-key errors no longer show the connect copy', async () => {
    await renderOutcome({ run: makeRun({ error: 'API key missing', status: 'failed' }) });
    await expect.element(page.getByText('Check the error before retrying.')).toBeVisible();
  });

  test('a failed idea review points to the related idea', async () => {
    await renderOutcome({
      run: makeRun({
        agentId: 'reviewer',
        error: 'Something odd',
        proposalId: 'prop-1' as AgentRun['proposalId'],
        status: 'failed'
      })
    });
    await expect
      .element(page.getByText('Open the related idea to decide the next step.'))
      .toBeVisible();
  });

  test('provider errors only count on failed runs', async () => {
    await renderOutcome({ run: makeRun({ error: 'API key missing', status: 'complete' }) });
    await expect.element(page.getByText('Results and activity are above.')).toBeVisible();
  });

  test('shows no actions without onRetry', async () => {
    await renderOutcome({ run: makeRun({ status: 'failed' }) });
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });

  test('shows the toolbar actions when onRetry is given', async () => {
    const onRetry = vi.fn();
    await renderOutcome({ onRetry, run: makeRun({ status: 'failed' }) });
    await page.getByRole('button', { name: 'Retry from zero' }).click();
    expect(onRetry).toHaveBeenCalledWith('run-1');
  });
});
