import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';
import {
  assignedToViewer,
  dashboardIssue,
  dashboardPoll,
  dashboardResearch,
  dashboardRun
} from '@/features/dashboard/testing/dashboard-activity-fixtures';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { DashboardReady } from './dashboard-ready';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

const sources = vi.hoisted(() => ({
  issues: { assigned: [] as unknown[], isLoading: false, open: [] as unknown[] },
  polls: { isLoading: false, polls: [] as unknown[] },
  research: { isLoading: false, research: [] as unknown[] },
  runs: { activity: [] as unknown[], isLoading: false, waiting: [] as unknown[] },
  runsFail: false
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-runs', () => ({
  useDashboardRuns: () => {
    if (sources.runsFail) throw new Error('runs source failed');
    return sources.runs;
  }
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-issues', () => ({
  useDashboardIssues: () => sources.issues
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-polls', () => ({
  useDashboardPolls: () => sources.polls
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-research', () => ({
  useDashboardResearch: () => sources.research
}));

beforeEach(() => {
  sources.issues = { assigned: [], isLoading: false, open: [] };
  sources.polls = { isLoading: false, polls: [] };
  sources.research = { isLoading: false, research: [] };
  sources.runs = { activity: [], isLoading: false, waiting: [] };
  sources.runsFail = false;
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

  test('places activity below the original sections, to-dos first', async () => {
    sources.runs = {
      activity: [dashboardRun({ id: 'run-1' as never })],
      isLoading: false,
      waiting: [dashboardRun({ id: 'run-2' as never, status: 'waiting' })]
    };
    sources.issues = {
      assigned: [dashboardIssue({ assignee: assignedToViewer, id: 'i-1' as never })],
      isLoading: false,
      open: [dashboardIssue({ id: 'i-2' as never })]
    };
    sources.polls = { isLoading: false, polls: [dashboardPoll()] };
    sources.research = { isLoading: false, research: [dashboardResearch()] };
    await render(
      <DashboardReady
        buckets={makeBuckets({
          ideaSnapshot: { conflicts: 0, decided: 1, drafts: 1, inReview: 0, total: 2 },
          recentlySettled: proposals(1, 'settled', 'merged'),
          waitingOnYou: proposals(1, 'waiting', 'in_review')
        })}
      />
    );
    await expect.element(page.getByText('Recently decided')).toBeVisible();
    const order = [
      testIds.dashboardWaitingIdeas,
      testIds.dashboardAgentWaits,
      testIds.dashboardAssignedIssues,
      testIds.dashboardOpenPolls,
      testIds.dashboardAgentActivity,
      testIds.dashboardOpenIssues,
      testIds.dashboardResearch
    ].map((id) => document.querySelector(`[data-testid="${id}"]`));
    order.forEach((element) => expect(element).not.toBeNull());
    for (let index = 1; index < order.length; index += 1) {
      const before = order[index - 1] as Element;
      const after = order[index] as Element;
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const settled = page.getByText('Recently decided').element();
    const firstActivity = order[1] as Element;
    expect(
      settled.compareDocumentPosition(firstActivity) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('hides every activity section when its source is empty', async () => {
    await render(<DashboardReady buckets={makeBuckets()} />);
    for (const id of [
      testIds.dashboardAgentWaits,
      testIds.dashboardAssignedIssues,
      testIds.dashboardOpenPolls,
      testIds.dashboardAgentActivity,
      testIds.dashboardOpenIssues,
      testIds.dashboardResearch
    ]) {
      expect(document.querySelector(`[data-testid="${id}"]`)).toBeNull();
    }
  });

  test('a failing source hides its sections but keeps the rest of the page', async () => {
    expectConsole('error', /runs source failed/u);
    sources.runsFail = true;
    sources.polls = { isLoading: false, polls: [dashboardPoll()] };
    await render(<DashboardReady buckets={makeBuckets()} />);
    await expect.element(page.getByTestId(testIds.dashboardOpenPolls)).toBeVisible();
    await expect.element(page.getByText('No active trips yet')).toBeVisible();
    expect(document.querySelector(`[data-testid="${testIds.dashboardAgentActivity}"]`)).toBeNull();
  });
});
