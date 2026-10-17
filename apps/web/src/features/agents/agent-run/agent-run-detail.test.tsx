import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import type { AgentRunEvent } from '@/features/agents/hooks/use-agent-run';
import { testIds } from '@/lib/test-ids';
import { AgentRunDetail, type AgentRunDetailLoadedProps } from './agent-run-detail';

vi.mock('@tanstack/react-router', async (importOriginal) => {
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

function makeEvent(overrides: Partial<AgentRunEvent> = {}): AgentRunEvent {
  return {
    at: 1_700_000_000_000,
    detail: null,
    id: 'event-1',
    input: null,
    kind: 'status',
    label: 'Reading the itinerary',
    ok: null,
    output: null,
    seq: 1,
    toolName: null,
    ...overrides
  } as unknown as AgentRunEvent;
}

function makeProps(overrides: Partial<AgentRunDetailLoadedProps> = {}): AgentRunDetailLoadedProps {
  return {
    agentLabel: 'Issue agent',
    events: [makeEvent()],
    eventsStatus: 'Exhausted',
    onLoadEarlier: vi.fn(),
    run: makeRun(),
    ...overrides
  };
}

describe('AgentRunDetail', () => {
  test('shows a labeled loading state without a run', async () => {
    await render(<AgentRunDetail isLoading />);
    await expect.element(page.getByRole('status', { name: 'Loading run…' })).toBeInTheDocument();
    await expect.element(page.getByRole('group', { name: 'Run details' })).toBeVisible();
    await expect.element(page.getByText('Run completed')).not.toBeInTheDocument();
  });

  test('shows the kickoff, events, outcome and run details', async () => {
    await render(<AgentRunDetail {...makeProps()} />);
    await expect.element(page.getByTestId(testIds.agentRunDetail)).toBeVisible();
    await expect.element(page.getByText(/started this run/u)).toBeVisible();
    await expect.element(page.getByText('Reading the itinerary')).toBeVisible();
    await expect.element(page.getByText('Agent is working')).toBeVisible();
    await expect.element(page.getByRole('group', { name: 'Run details' })).toBeVisible();
    await expect.element(page.getByText('Called by')).toBeVisible();
  });

  test.each([
    ['assign', 'started this run'],
    ['queue', 'queued this run']
  ] as const)('a %s kickoff reads "%s"', async (kickoff, text) => {
    await render(<AgentRunDetail {...makeProps({ run: makeRun({ kickoff }) })} />);
    await expect.element(page.getByText(new RegExp(text, 'u'))).toBeVisible();
  });

  test('shows a loading log while events are loading', async () => {
    await render(
      <AgentRunDetail {...makeProps({ events: undefined, eventsStatus: 'LoadingFirstPage' })} />
    );
    await expect.element(page.getByLabelText('Loading activity')).toBeVisible();
    await expect.element(page.getByText('Reading the itinerary')).not.toBeInTheDocument();
  });

  test('shows the report from the agent', async () => {
    await render(
      <AgentRunDetail {...makeProps({ run: makeRun({ report: 'Opened a draft idea.' }) })} />
    );
    await expect.element(page.getByTestId(testIds.agentRunReport)).toBeVisible();
    await expect.element(page.getByText('Opened a draft idea.')).toBeVisible();
    await expect.element(page.getByText(/from Issue agent/u)).toBeVisible();
  });

  test('omits the report when the run has none', async () => {
    await render(<AgentRunDetail {...makeProps()} />);
    await expect.element(page.getByTestId(testIds.agentRunReport)).not.toBeInTheDocument();
  });

  test('shows the related idea only with a proposal and trip', async () => {
    await render(
      <AgentRunDetail
        {...makeProps({
          run: makeRun({
            proposalId: 'prop-1' as AgentRun['proposalId'],
            related: { chatTitle: null, ideaTitle: 'Add Porto', issueTitle: null, tripName: null }
          })
        })}
      />
    );
    await expect.element(page.getByTestId(testIds.agentRunIdea)).toBeVisible();
    await expect.element(page.getByText('Add Porto')).toBeVisible();
  });

  test.each([
    ['no proposal', { proposalId: null }],
    ['no trip', { proposalId: 'prop-1' as AgentRun['proposalId'], tripId: null }]
  ])('hides the related idea with %s', async (_, overrides) => {
    await render(<AgentRunDetail {...makeProps({ run: makeRun(overrides) })} />);
    await expect.element(page.getByTestId(testIds.agentRunIdea)).not.toBeInTheDocument();
  });

  test.each(['CanLoadMore', 'LoadingMore'] as const)(
    'offers "Load earlier" while %s',
    async (eventsStatus) => {
      await render(<AgentRunDetail {...makeProps({ eventsStatus })} />);
      const button = page.getByRole('button', { name: 'Load earlier' });
      await expect.element(button).toBeVisible();
      if (eventsStatus === 'LoadingMore') await expect.element(button).toBeDisabled();
      else await expect.element(button).toBeEnabled();
    }
  );

  test.each(['Exhausted', 'Done'] as const)('no "Load earlier" when %s', async (eventsStatus) => {
    await render(<AgentRunDetail {...makeProps({ eventsStatus })} />);
    await expect
      .element(page.getByRole('button', { name: 'Load earlier' }))
      .not.toBeInTheDocument();
  });

  test('Load earlier calls onLoadEarlier', async () => {
    const onLoadEarlier = vi.fn();
    await render(<AgentRunDetail {...makeProps({ eventsStatus: 'CanLoadMore', onLoadEarlier })} />);
    await page.getByRole('button', { name: 'Load earlier' }).click();
    expect(onLoadEarlier).toHaveBeenCalledTimes(1);
  });

  test('a failed run can be retried from the outcome card', async () => {
    const onRetry = vi.fn();
    await render(
      <AgentRunDetail {...makeProps({ onRetry, run: makeRun({ status: 'failed' }) })} />
    );
    await page.getByTestId(testIds.agentRetryFromZero).click();
    expect(onRetry).toHaveBeenCalledWith('run-1');
  });

  test('an active run can be stopped from the outcome card', async () => {
    const onStop = vi.fn();
    await render(<AgentRunDetail {...makeProps({ onRetry: vi.fn(), onStop })} />);
    await page.getByTestId(testIds.agentStop).click();
    expect(onStop).toHaveBeenCalledWith('run-1');
  });
});
