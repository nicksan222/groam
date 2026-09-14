import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { IssueAgentBanner } from './issue-agent-banner';

const retry = vi.hoisted(() => vi.fn());
const stop = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  events: [] as Array<{ id: string; label: string }>,
  run: null as null | {
    error: string | null;
    headline: string | null;
    id: Id<'agentRuns'>;
    issueId: Id<'tripIssues'> | null;
    status: 'failed' | 'queued' | 'running';
    surface: string;
  }
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop }),
  useAgentRunEvents: () => ({ events: state.events, loadMore: vi.fn(), status: 'Exhausted' }),
  useIssueAgentRun: () => state.run,
  useStartQueuedAssignRuns: () => undefined
}));

const issueId = 'issue-1' as Id<'tripIssues'>;

beforeEach(() => {
  vi.clearAllMocks();
  state.events = [];
  state.run = null;
});

afterEach(cleanup);

test('hides when the Issue agent has no run', () => {
  render(<IssueAgentBanner issueId={issueId} />);
  expect(screen.queryByTestId('issue-agent-banner')).toBeNull();
});

test('renders the shared agent run banner for an issue run', () => {
  state.run = {
    error: null,
    headline: 'Started working',
    id: 'run-1' as Id<'agentRuns'>,
    issueId,
    status: 'running',
    surface: 'standalone'
  };
  render(<IssueAgentBanner issueId={issueId} />);
  expect(screen.getByTestId('issue-agent-banner')).toBeTruthy();
  expect(screen.getByText('Issue agent')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Retry from zero' })).toBeNull();
});

test('retries from zero when the Issue agent run failed', () => {
  state.run = {
    error: 'The model timed out',
    headline: 'Run failed',
    id: 'run-1' as Id<'agentRuns'>,
    issueId,
    status: 'failed',
    surface: 'standalone'
  };
  render(<IssueAgentBanner issueId={issueId} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retry from zero' }));
  expect(retry).toHaveBeenCalledWith({ runId: 'run-1' });
});
