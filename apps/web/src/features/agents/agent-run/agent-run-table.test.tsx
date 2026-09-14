import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { testIds } from '@/lib/test-ids';
import { AgentRunTable } from './agent-run-table';

const retry = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop: vi.fn() })
}));

vi.mock('@tanstack/react-router', async () => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return createAgentTestRouterMock(navigate);
});

afterEach(cleanup);

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

test('renders run, agent, caller, status, and updated columns', () => {
  render(<AgentRunTable runs={[run()]} />);
  const row = screen.getByTestId(testIds.agentCard);
  expect(row.tagName).toBe('TR');
  expect(screen.getByText('Idea reviewer')).toBeTruthy();
  expect(screen.getByText('Alex')).toBeTruthy();
  expect(screen.getByText('Failed')).toBeTruthy();

  const cell = screen.getByTestId(testIds.agentRunFeedRunCell);
  expect(cell.className).toContain('min-w-0');
  const title = screen.getByRole('link', { name: /Kyoto food crawl/u });
  expect(title.className).toContain('truncate');
  expect(title.className).toContain('font-semibold');
  expect(title.getAttribute('href')).toBe('/agents/reviewer/run-failed');

  const detail = screen.getByText(/Groam AI is temporarily unavailable/u);
  expect(detail.className).toContain('truncate');
  expect(detail.className).toContain('text-xs');
  expect(screen.queryByTestId(testIds.agentRetryFromZero)).toBeNull();
});

test('retries from zero without navigating away', () => {
  render(<AgentRunTable runs={[run({ issueId: 'issue-1' as never })]} />);
  const retryButton = screen.getByTestId(testIds.agentRetryFromZero);
  expect(retryButton.textContent).toBe('');
  fireEvent.click(retryButton);
  expect(retry).toHaveBeenCalledWith({ runId: 'run-failed' });
  expect(navigate).not.toHaveBeenCalled();
});
