import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { DiscussionWaitBanner } from './discussion-wait-banner';

const cancelWait = vi.hoisted(() => vi.fn());
const stop = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  waits: [] as Array<{
    agentId: 'groam' | 'issue';
    deadlineAt: number;
    id: string;
    kind: 'timer';
    label: string;
    progress: string | null;
    runId: string;
    status: 'waiting';
  }>
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({
    children,
    params,
    to
  }: {
    children?: ReactNode;
    params?: { agentId?: string };
    to: string;
  }) => (
    <a data-agent-id={params?.agentId} href={to}>
      {children}
    </a>
  )
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry: vi.fn(), start: vi.fn(), stop })
}));

vi.mock('@/features/agents/hooks/use-agent-waits', () => ({
  useCancelWait: () => cancelWait,
  useDiscussionWaits: () => state.waits
}));

const discussionId = 'chat-1' as Id<'discussions'>;

beforeEach(() => {
  vi.clearAllMocks();
  state.waits = [];
});

test('renders nothing while no run in the chat is waiting', async () => {
  await render(<DiscussionWaitBanner discussionId={discussionId} />);
  await expect.element(page.getByTestId(testIds.discussionWaitBanner)).not.toBeInTheDocument();
});

test('shows each waiting run with progress and cancels its wait', async () => {
  state.waits = [
    {
      agentId: 'issue',
      deadlineAt: Date.parse('2026-10-18T18:00:00Z'),
      id: 'wait-1',
      kind: 'timer',
      label: 'a timer',
      progress: '3 of 5 voted',
      runId: 'run-1',
      status: 'waiting'
    }
  ];
  const view = await render(<DiscussionWaitBanner discussionId={discussionId} />);
  await expect.element(page.getByTestId(testIds.discussionWaitBanner)).toBeInTheDocument();
  await expect.element(page.getByText('Issue agent')).toBeInTheDocument();
  await expect
    .element(page.getByRole('link', { name: 'View agent' }))
    .toHaveAttribute('data-agent-id', 'issue');
  await expect.element(page.getByText('Waiting for a timer')).toBeInTheDocument();
  await expect.element(page.getByText('3 of 5 voted')).toBeInTheDocument();
  await page.getByTestId(testIds.agentWaitCancel).click();
  expect(cancelWait).toHaveBeenCalledWith('wait-1');
  await page.getByTestId(testIds.agentStop).click();
  expect(stop).toHaveBeenCalledWith({ runId: 'run-1' });
  // The wait resolved: the subscription returns no waits and the banner goes away.
  state.waits = [];
  await view.rerender(<DiscussionWaitBanner discussionId={discussionId} />);
  await expect.element(page.getByTestId(testIds.discussionWaitBanner)).not.toBeInTheDocument();
});
