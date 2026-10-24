import { agentRunCopy } from '@groam/ai/backend/runs/events';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { useResearchRun } from '@/features/research/hooks/use-research-run';
import type { DiscussionMessage } from '@/types/discussions';
import type { ResearchDetail } from '@/types/research';
import { ResearchTimeline } from './research-timeline';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="/agents/researcher/run">{children}</a>
}));

type Activity = ReturnType<typeof useResearchRun>;

const research: ResearchDetail = {
  brief: 'Compare quiet hotels.',
  canManage: true,
  id: 'r1',
  links: [
    {
      createdAt: 1_000,
      createdByName: 'Ada',
      href: null,
      id: 'l1',
      label: 'Check lift access',
      target: { id: 'i1', kind: 'issue' }
    }
  ],
  shortId: 'r1',
  title: 'Hotels in Rome',
  tripId: 't1'
};

const run = (status: string) =>
  ({
    completedAt: status === 'complete' ? 2_000 : null,
    headline: 'Reading sources',
    id: 'run1',
    report: status === 'complete' ? 'Report' : null,
    status,
    updatedAt: 2_000
  }) as unknown as NonNullable<Activity['run']>;

const activity = (status: null | string, overrides: Partial<Activity> = {}): Activity =>
  ({
    error: null,
    events: [],
    isActive: status === 'running',
    isLoading: false,
    isStarting: false,
    run: status ? run(status) : null,
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }) as Activity;

const note = {
  _creationTime: 3_000,
  author: { name: 'Bea' },
  key: 'n1',
  mine: false,
  parts: [],
  role: 'user',
  status: 'success',
  text: 'A quiet street matters more than a pool.'
} as unknown as DiscussionMessage;

const view = (current: Activity, props: Partial<Parameters<typeof ResearchTimeline>[0]> = {}) =>
  render(
    <ResearchTimeline
      activity={current}
      caveat="Prices were not checked."
      notes={[note]}
      notesStatus="Exhausted"
      onLoadMore={vi.fn()}
      onOpen={vi.fn()}
      onSaveBrief={vi.fn()}
      research={research}
      sourceCount={2}
      writable
      {...props}
    />
  );

test('opens with the brief, then links, runs, and notes in the order they happened', async () => {
  const onOpen = vi.fn();
  await view(activity('complete'), { onOpen });
  const items = page.getByRole('list', { name: 'Research history' }).getByRole('listitem');
  expect(items.elements()).toHaveLength(4);
  expect(items.nth(0).element().textContent).toContain('Compare quiet hotels.');
  expect(items.nth(1).element().textContent).toContain('Ada linked issue Check lift access');
  expect(items.nth(2).element().textContent).toContain(
    'Researcher finished a run · cited 2 sources'
  );
  expect(items.nth(2).element().textContent).toContain('Prices were not checked.');
  expect(items.nth(3).element().textContent).toContain('A quiet street matters');
  await page.getByRole('button', { name: 'Check lift access' }).click();
  expect(onOpen).toHaveBeenCalledWith(research.links[0]);
});

test('shows live progress for an active run and lets the group stop it', async () => {
  const current = activity('running');
  await view(current);
  await page.getByRole('button', { name: agentRunCopy.stop }).click();
  expect(current.stop).toHaveBeenCalledOnce();
  await expect.element(page.getByText('Researcher finished a run')).not.toBeInTheDocument();
});

test('hides stop controls on archived trips and loads earlier notes on request', async () => {
  const onLoadMore = vi.fn();
  await view(activity('running'), { notesStatus: 'CanLoadMore', onLoadMore, writable: false });
  await expect
    .element(page.getByRole('button', { name: agentRunCopy.stop }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Show earlier notes' }).click();
  expect(onLoadMore).toHaveBeenCalledOnce();
});
