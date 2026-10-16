import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { DashboardReady } from './dashboard-ready';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const navigate = vi.fn();
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    Link: ({
      children,
      className,
      params,
      to
    }: {
      children?: ReactNode;
      className?: string;
      params?: Record<string, string>;
      to: string;
    }) => {
      let href = to;
      for (const [key, value] of Object.entries(params ?? {})) {
        href = href.replace(`$${key}`, value);
      }
      return (
        <a className={className} href={href} onClick={(event) => event.preventDefault()}>
          {children}
        </a>
      );
    },
    useNavigate: () => navigate
  };
});

function proposals(count: number, prefix: string, status: WorkspaceTripProposal['status']) {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        author: { name: 'Lea', userId: 'user-1' },
        id: `${prefix}-${index}`,
        reviewRequested: false,
        sourceTripId: 'trip-1',
        sourceTripName: 'Lisbon',
        status,
        title: `${prefix} ${index}`,
        updatedAt: Date.now()
      }) as unknown as WorkspaceTripProposal
  );
}

function trips(count: number) {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        coverUrl: null,
        dateNotes: null,
        destination: null,
        id: `trip-${index}`,
        name: `Trip ${index}`,
        nextAction: null,
        outstandingActionCount: 0
      }) as unknown as TripListItem
  );
}

function makeBuckets(overrides: Partial<DashboardBuckets> = {}): DashboardBuckets {
  return {
    activeTrips: [],
    ideaSnapshot: { conflicts: 0, decided: 0, drafts: 0, inReview: 0, total: 0 },
    metrics: { activeTrips: 0, openIdeas: 0, settled: 0, waitingOnYou: 0 },
    recentlySettled: [],
    tripsNeedingAttention: [],
    waitingOnYou: [],
    yourDrafts: [],
    ...overrides
  };
}

describe('DashboardReady', () => {
  test('with nothing to show keeps only the trips and ideas empty states', async () => {
    await render(<DashboardReady buckets={makeBuckets()} />);
    await expect.element(page.getByText('No active trips yet')).toBeVisible();
    await expect.element(page.getByText('No ideas in progress')).toBeVisible();
    await expect.element(page.getByText('Needs your attention')).not.toBeInTheDocument();
    await expect.element(page.getByText('Recent ideas')).not.toBeInTheDocument();
    await expect.element(page.getByText('Recently decided')).not.toBeInTheDocument();
  });

  test('shows the waiting, snapshot and settled sections when they have data', async () => {
    await render(
      <DashboardReady
        buckets={makeBuckets({
          ideaSnapshot: { conflicts: 0, decided: 1, drafts: 1, inReview: 0, total: 2 },
          recentlySettled: proposals(1, 'settled', 'merged'),
          waitingOnYou: proposals(1, 'waiting', 'in_review')
        })}
      />
    );
    await expect.element(page.getByText('Needs your attention')).toBeVisible();
    await expect.element(page.getByText('Recent ideas')).toBeVisible();
    await expect.element(page.getByText('Recently decided')).toBeVisible();
  });

  test('caps waiting ideas at 3 and the other lists at 4', async () => {
    await render(
      <DashboardReady
        buckets={makeBuckets({
          activeTrips: trips(6),
          recentlySettled: proposals(6, 'settled', 'merged'),
          waitingOnYou: proposals(5, 'waiting', 'in_review'),
          yourDrafts: proposals(6, 'draft', 'draft')
        })}
      />
    );
    expect(page.getByRole('article').elements().length).toBe(3);
    expect(page.getByRole('heading', { level: 3 }).elements().length).toBe(4);
    await expect.element(page.getByText('draft 3', { exact: true })).toBeVisible();
    await expect.element(page.getByText('draft 4', { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText('settled 3', { exact: true })).toBeVisible();
    await expect.element(page.getByText('settled 4', { exact: true })).not.toBeInTheDocument();
  });
});
