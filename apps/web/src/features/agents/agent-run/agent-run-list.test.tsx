import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { testIds } from '@/lib/test-ids';
import { AgentRunList } from './agent-run-list';

const retry = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop: vi.fn() })
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});

const longError =
  'Groam AI is temporarily unavailable. Check your provider settings and try again in a few minutes.';

function run(overrides: Partial<WorkspaceAgentRun> = {}): WorkspaceAgentRun {
  return {
    agentId: 'reviewer',
    completedAt: null,
    createdBy: { name: 'Alex', userId: 'user-alex' },
    discussionId: null,
    error: longError,
    headline: 'Reviewing',
    id: 'run-failed' as WorkspaceAgentRun['id'],
    issueId: null,
    kickoff: 'assign',
    proposalId: null,
    shortId: 'runabc',
    related: {
      chatTitle: null,
      ideaTitle: null,
      issueTitle: null,
      tripName: null
    },
    report: null,
    startedAt: null,
    status: 'failed',
    surface: 'standalone',
    threadId: null,
    title: 'Kyoto food crawl with a very long itinerary title that must not cover status',
    tripId: null,
    updatedAt: Date.now(),
    ...overrides
  };
}

test('renders a linked record with agent, caller, status, and update context', async () => {
  await render(<AgentRunList runs={[run()]} />);
  const row = page.getByTestId(testIds.agentCard).element();
  expect(row.tagName).toBe('ARTICLE');
  await expect.element(page.getByText('Idea reviewer')).toBeInTheDocument();
  await expect.element(page.getByText('by Alex')).toBeInTheDocument();
  await expect.element(page.getByText('Failed')).toBeInTheDocument();

  const cell = page.getByTestId(testIds.agentRunFeedRunCell).element();
  expect(cell.className).toContain('min-w-0');
  const title = page.getByRole('link', { name: /Kyoto food crawl/u }).element();
  expect(title.className).toContain('font-semibold');
  expect(title.getAttribute('href')).toBe('/agents/reviewer/run-failed');

  const detail = page.getByText(/Groam AI is temporarily unavailable/u).element();
  expect(detail.className).toContain('truncate');
  await expect.element(page.getByTestId(testIds.agentRetryFromZero)).not.toBeInTheDocument();
});

test('retries from zero without navigating away', async () => {
  await render(<AgentRunList runs={[run({ issueId: 'issue-1' as never })]} />);
  const retryButton = page.getByTestId(testIds.agentRetryFromZero).element();
  expect(retryButton.textContent).toBe('');
  await userEvent.click(retryButton);
  expect(retry).toHaveBeenCalledWith({ runId: 'run-failed' });
  expect(navigate).not.toHaveBeenCalled();
});

test('combines status and trip search, then clears both filters', async () => {
  await render(
    <AgentRunList
      runs={[
        run({
          id: 'failed-kyoto' as WorkspaceAgentRun['id'],
          related: { chatTitle: null, ideaTitle: null, issueTitle: null, tripName: 'Kyoto' },
          title: 'Check opening hours'
        }),
        run({
          error: null,
          id: 'done-kyoto' as WorkspaceAgentRun['id'],
          related: { chatTitle: null, ideaTitle: null, issueTitle: null, tripName: 'Kyoto' },
          status: 'complete',
          title: 'Find a hotel'
        }),
        run({ id: 'failed-other' as WorkspaceAgentRun['id'], title: 'Check train times' })
      ]}
    />
  );
  await page.getByRole('combobox', { name: 'Filter runs by status' }).click();
  await page.getByRole('option', { name: 'Failed', exact: true }).click();
  await page.getByTestId(testIds.agentsRunsFilter).fill('Kyoto');
  await expect.element(page.getByText('Check opening hours')).toBeVisible();
  await expect.element(page.getByText('Find a hotel')).not.toBeInTheDocument();
  await expect.element(page.getByText('Check train times')).not.toBeInTheDocument();
  await expect.element(page.getByText('Kyoto', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Clear/u }).click();
  await expect.element(page.getByText('Find a hotel')).toBeVisible();
  await expect.element(page.getByText('Check train times')).toBeVisible();
});

test('keeps filters available when no run matches', async () => {
  await render(<AgentRunList runs={[run()]} />);
  await page.getByRole('combobox', { name: 'Filter runs by status' }).click();
  await page.getByRole('option', { name: 'Running', exact: true }).click();
  await expect.element(page.getByText('No runs match your filters.')).toBeVisible();
  await page.getByRole('button', { name: /Clear/u }).click();
  await expect.element(page.getByText('Failed', { exact: true })).toBeVisible();
});

test('aligns desktop status, timestamp, retry control, and avatar on one line', async () => {
  await useViewport(1280, 800);
  await render(<AgentRunList runs={[run({ issueId: 'issue-1' as never })]} />);
  const row = page.getByTestId(testIds.agentCard).element();
  const centerY = (element: Element) => {
    const box = element.getBoundingClientRect();
    return box.top + box.height / 2;
  };
  const status = page.getByText('Failed', { exact: true }).element();
  const time = row.querySelector('time');
  expect(time).not.toBeNull();
  const aligned = [
    time!,
    page.getByTestId(testIds.agentRetryFromZero).element(),
    page.getByRole('img', { name: 'Started by Alex' }).element()
  ];
  for (const element of aligned) {
    expect(Math.abs(centerY(element) - centerY(status))).toBeLessThanOrEqual(1);
  }
});
