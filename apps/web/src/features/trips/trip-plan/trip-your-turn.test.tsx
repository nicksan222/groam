import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { QueueItem } from '@/types/queue';
import { TripYourTurn } from './trip-your-turn';

const state = vi.hoisted(() => ({
  isLoading: false,
  items: [] as unknown[],
  more: { ideas: 0, issues: 0, polls: 0 },
  progress: null as { done: number; total: number } | null,
  total: 0
}));

vi.mock('@/lib/navigation/router', async () => ({
  ...(await (await import('@/lib/testing/router-mock')).mockRouterTargets()),
  useParams: () => ({ tripId: 'abc123' })
}));
vi.mock('@/features/trips/hooks/use-trip-your-turn', () => ({
  useTripYourTurn: () => ({
    isLoading: state.isLoading,
    items: state.items,
    more: state.more,
    progress: state.progress,
    total: state.total
  })
}));

const trip = { archivedAt: null, id: 'trip-1' } as unknown as TripDetail;

function row(id: string, kind: 'idea' | 'issue' | 'poll', title: string, extra: object = {}) {
  return {
    href:
      kind === 'issue'
        ? { params: { issueId: id }, to: '/issues/$issueId' }
        : {
            params: { proposalId: id, tripId: 'trip-1', view: 'overview' },
            to: '/trips/$tripId/ideas/$proposalId/$view'
          },
    id,
    kind,
    settled: false,
    status: { label: kind === 'issue' ? 'Open' : 'In review', tone: 'info' },
    title,
    updatedAt: 1,
    who: 'By Sam',
    yourTurn: true,
    ...extra
  } as QueueItem;
}

beforeEach(() => {
  state.items = [];
  state.isLoading = false;
  state.more = { ideas: 0, issues: 0, polls: 0 };
  state.progress = null;
  state.total = 0;
});

describe('TripYourTurn', () => {
  test('is hidden when nothing waits on the viewer and no issue is mandatory', async () => {
    await render(<TripYourTurn trip={trip} />);
    await expect.element(page.getByTestId(testIds.planYourTurn)).not.toBeInTheDocument();
  });

  test('lists each item as a link into its own page, with no links on when all fit', async () => {
    state.items = [row('i1', 'issue', 'Book flights'), row('p1', 'idea', 'Add a beach day')];
    await render(<TripYourTurn trip={trip} />);
    const rows = page.getByTestId(testIds.planYourTurnRow);
    await expect.poll(() => rows.elements()).toHaveLength(2);
    await expect
      .element(page.getByRole('link', { name: /Book flights/u }))
      .toHaveAttribute('href', '/issues/i1');
    await expect
      .element(page.getByRole('link', { name: /Add a beach day/u }))
      .toHaveAttribute('href', '/trips/trip-1/ideas/p1/overview');
    await expect.element(page.getByTestId(testIds.planYourTurnMore)).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.planMandatoryProgress)).not.toBeInTheDocument();
  });

  test("ends with a link to each section that holds more of the viewer's items", async () => {
    state.items = [
      row('i1', 'issue', 'One'),
      row('i2', 'issue', 'Two'),
      row('i3', 'issue', 'Three')
    ];
    state.more = { ideas: 2, issues: 1, polls: 3 };
    await render(<TripYourTurn trip={trip} />);
    const more = page.getByTestId(testIds.planYourTurnMore);
    await expect.poll(() => more.elements()).toHaveLength(3);
    await expect
      .element(page.getByRole('link', { name: '2 more in Ideas' }))
      .toHaveAttribute('href', '/trips/abc123/ideas');
    await expect
      .element(page.getByRole('link', { name: '1 more in Issues' }))
      .toHaveAttribute('href', '/trips/abc123/issues');
    await expect
      .element(page.getByRole('link', { name: '3 more in Polls' }))
      .toHaveAttribute('href', '/trips/abc123/polls');
  });

  test('is hidden until both lists have loaded', async () => {
    state.isLoading = true;
    state.items = [row('i1', 'issue', 'One')];
    await render(<TripYourTurn trip={trip} />);
    await expect.element(page.getByTestId(testIds.planYourTurn)).not.toBeInTheDocument();
  });

  test('counts everything that waits in its heading, as the queues do', async () => {
    state.items = [row('i1', 'issue', 'One')];
    state.total = 4;
    await render(<TripYourTurn trip={trip} />);
    await expect.element(page.getByRole('heading', { name: 'Your turn · 4' })).toBeVisible();
  });

  test("a poll leads to the viewer's polls, and a due date shows as in the queues", async () => {
    state.items = [
      row('p1', 'poll', 'Dinner Friday', {
        dueAt: Date.now() - 2 * 86_400_000,
        poll: {},
        status: { label: 'Voting', tone: 'info' }
      })
    ];
    await render(<TripYourTurn trip={trip} />);
    await expect
      .element(page.getByRole('link', { name: /Dinner Friday/u }))
      .toHaveAttribute('href', '/trips/abc123/polls');
    await expect.element(page.getByText(/Overdue · /u)).toBeVisible();
    await expect.element(page.getByText('Voting')).toBeVisible();
  });

  test('links only to the sections with something left out', async () => {
    state.items = [row('i1', 'issue', 'One')];
    state.more = { ideas: 0, issues: 4, polls: 0 };
    await render(<TripYourTurn trip={trip} />);
    await expect.element(page.getByRole('link', { name: '4 more in Issues' })).toBeVisible();
    await expect.element(page.getByText(/more in Ideas/u)).not.toBeInTheDocument();
  });

  test('shows how many mandatory issues are done, alone when nothing waits on the viewer', async () => {
    state.progress = { done: 1, total: 3 };
    await render(<TripYourTurn trip={trip} />);
    await expect.element(page.getByTestId(testIds.planMandatoryProgress)).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: '1 of 3 mandatory done' }))
      .toHaveAttribute('href', '/trips/abc123/issues');
    await expect
      .element(page.getByRole('progressbar'))
      .toHaveAttribute('aria-valuetext', '1 of 3 mandatory done');
    await expect.element(page.getByTestId(testIds.planYourTurnRow)).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.planYourTurnMore)).not.toBeInTheDocument();
  });
});
