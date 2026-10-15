import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { testIds } from '@/lib/test-ids';
import { AgentRunTable } from './agent-run-table';

const retry = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop: vi.fn() })
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    ...createAgentTestRouterMock(navigate)
  };
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

test('renders run, agent, caller, status, and updated columns', async () => {
  await render(<AgentRunTable runs={[run()]} />);
  const row = page.getByTestId(testIds.agentCard).element();
  expect(row.tagName).toBe('TR');
  await expect.element(page.getByText('Idea reviewer')).toBeInTheDocument();
  await expect.element(page.getByText('Alex')).toBeInTheDocument();
  await expect.element(page.getByText('Failed')).toBeInTheDocument();

  const cell = page.getByTestId(testIds.agentRunFeedRunCell).element();
  expect(cell.className).toContain('min-w-0');
  const title = page.getByRole('link', { name: /Kyoto food crawl/u }).element();
  expect(title.className).toContain('truncate');
  expect(title.className).toContain('font-semibold');
  expect(title.getAttribute('href')).toBe('/agents/reviewer/run-failed');

  const detail = page.getByText(/Groam AI is temporarily unavailable/u).element();
  expect(detail.className).toContain('truncate');
  expect(detail.className).toContain('text-xs');
  await expect.element(page.getByTestId(testIds.agentRetryFromZero)).not.toBeInTheDocument();
});

test('retries from zero without navigating away', async () => {
  await render(<AgentRunTable runs={[run({ issueId: 'issue-1' as never })]} />);
  const retryButton = page.getByTestId(testIds.agentRetryFromZero).element();
  expect(retryButton.textContent).toBe('');
  await userEvent.click(retryButton);
  expect(retry).toHaveBeenCalledWith({ runId: 'run-failed' });
  expect(navigate).not.toHaveBeenCalled();
});
