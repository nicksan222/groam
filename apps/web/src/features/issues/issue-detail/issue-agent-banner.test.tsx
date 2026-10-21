import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { IssueAgentBanner } from './issue-agent-banner';

const cancelWait = vi.hoisted(() => vi.fn());
const retry = vi.hoisted(() => vi.fn());
const stop = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  events: [] as Array<{ id: string; label: string }>,
  run: null as null | {
    error: string | null;
    headline: string | null;
    id: Id<'agentRuns'>;
    issueId: Id<'tripIssues'> | null;
    status: 'failed' | 'queued' | 'running' | 'waiting';
    surface: string;
  },
  wait: null as null | {
    deadlineAt: number;
    id: string;
    label: string;
    progress: string | null;
  }
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop }),
  useAgentRunEvents: () => ({ events: state.events, loadMore: vi.fn(), status: 'Exhausted' }),
  useIssueAgentRun: () => state.run,
  useStartQueuedAssignRuns: () => undefined
}));

vi.mock('@/features/agents/hooks/use-agent-waits', () => ({
  useCancelWait: () => cancelWait,
  useRunWait: (runId: string | undefined) => (runId ? state.wait : undefined)
}));

const issueId = 'issue-1' as Id<'tripIssues'>;

beforeEach(() => {
  vi.clearAllMocks();
  state.events = [];
  state.run = null;
  state.wait = null;
});

test('hides when the Issue agent has no run', async () => {
  await render(<IssueAgentBanner issueId={issueId} />);
  await expect.element(page.getByTestId(testIds.issueAgentBanner)).not.toBeInTheDocument();
});

test('renders the shared agent run banner for an issue run', async () => {
  state.run = {
    error: null,
    headline: 'Started working',
    id: 'run-1' as Id<'agentRuns'>,
    issueId,
    status: 'running',
    surface: 'standalone'
  };
  await render(<IssueAgentBanner issueId={issueId} />);
  await expect.element(page.getByTestId(testIds.issueAgentBanner)).toBeInTheDocument();
  await expect.element(page.getByText('Issue agent')).toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Retry from zero' }))
    .not.toBeInTheDocument();
});

test('retries from zero when the Issue agent run failed', async () => {
  state.run = {
    error: 'The model timed out',
    headline: 'Run failed',
    id: 'run-1' as Id<'agentRuns'>,
    issueId,
    status: 'failed',
    surface: 'standalone'
  };
  await render(<IssueAgentBanner issueId={issueId} />);
  await page.getByRole('button', { name: 'Retry from zero' }).click();
  expect(retry).toHaveBeenCalledWith({ runId: 'run-1' });
});

test('a waiting run shows its wait and cancels it', async () => {
  state.run = {
    error: null,
    headline: 'Waiting for a timer',
    id: 'run-1' as Id<'agentRuns'>,
    issueId,
    status: 'waiting',
    surface: 'standalone'
  };
  state.wait = {
    deadlineAt: Date.parse('2026-10-18T18:00:00Z'),
    id: 'wait-1',
    label: 'a timer',
    progress: null
  };
  await render(<IssueAgentBanner issueId={issueId} />);
  await expect.element(page.getByText('Waiting for a timer')).toBeInTheDocument();
  await page.getByTestId(testIds.agentWaitCancel).click();
  expect(cancelWait).toHaveBeenCalledWith('wait-1');
  await expect.element(page.getByTestId(testIds.agentStop)).toBeInTheDocument();
});
