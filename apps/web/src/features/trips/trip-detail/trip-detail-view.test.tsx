import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripTabSection } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';
import { TripDetailView } from './trip-detail-view';

const state = vi.hoisted(() => ({
  agentContext: vi.fn(),
  pollsRequested: [] as unknown[],
  exists: true as boolean | undefined,
  proposals: undefined as unknown[] | undefined,
  start: vi.fn(),
  trip: undefined as TripDetail | undefined
}));

const remember = vi.hoisted(() => vi.fn());
vi.mock('@/features/polls/hooks/use-polls', () => ({
  useTripPolls: (tripId: unknown) => {
    state.pollsRequested.push(tripId);
    return { canLoadMore: false, isLoading: false, loadMore: vi.fn(), polls: [] };
  }
}));
vi.mock('@/features/trips/hooks/use-remember-trip', () => ({ useRememberTrip: remember }));
vi.mock('@/features/research/hooks/use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: false, researches: [] })
}));

vi.mock('@/lib/navigation/router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ createTrip: vi.fn(), trips: [] }),
  useTrip: () => ({
    archive: vi.fn(),
    exists: state.exists,
    restore: vi.fn(),
    trip: state.trip,
    update: vi.fn()
  })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/trips/hooks/use-trip-versions')>()),
  useTripVersions: () => ({ createVersion: vi.fn(), proposals: state.proposals })
}));

vi.mock('@/features/trips/hooks/use-start-idea-flow', () => ({
  useStartIdeaFlow: () => ({
    continueDraft: vi.fn(),
    create: vi.fn(),
    dialogOpen: false,
    existingDraftOpen: false,
    isCreating: false,
    pendingDraft: undefined,
    setDialogOpen: vi.fn(),
    setExistingDraftOpen: vi.fn(),
    start: state.start,
    startAnotherIdea: vi.fn(),
    titleHint: undefined
  })
}));

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({ goingCount: 3, isLoading: false, travelers: [] })
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: [] })
}));

vi.mock('@/features/trips/hooks/use-trip-agent-context', () => ({
  useTripAgentContext: (...args: unknown[]) => state.agentContext(...args)
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } }),
  useWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

vi.mock('@/features/trips/trip-ideas/create-trip-idea-dialog', () => ({
  CreateTripIdeaDialog: () => null
}));

vi.mock('@/features/trips/trip-plan/trip-plan-panel', () => ({
  TripPlanPanel: () => <div data-testid={testIds.tripPlanPage}>Plan section</div>
}));

vi.mock('@/features/trips/trip-detail/trip-calendar-page', () => ({
  TripCalendarPage: () => <div>Calendar section</div>
}));

vi.mock('@/features/trip-queue/queue-panel', () => ({
  QueuePanel: ({ kind }: { kind: string }) => <div>{kind} queue section</div>
}));

vi.mock('@/features/trips/trip-packing/trip-packing-panel', () => ({
  TripPackingPanel: () => <div>Packing list</div>
}));

vi.mock('@/features/trips/trip-people/trip-payments-panel', () => ({
  TripPaymentsPanel: ({ tripId }: { tripId: string }) => <div>Payments for {tripId}</div>
}));

vi.mock('@/features/trips/trip-detail/trip-details-editor', () => ({
  TripDetailsEditor: () => null
}));

function tripDetail(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    activity: [],
    archivedAt: null,
    arrivalTransfer: null,
    canParticipate: true,
    coverAttribution: null,
    coverStatus: 'ready',
    coverUrl: null,
    currency: 'EUR',
    dateNotes: null,
    departureTransfer: null,
    destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
    destinations: [],
    groupMemberCount: 3,
    id: 'working-1' as Id<'trips'>,
    initialBudget: null,
    name: 'Summer escape',
    permissions: {
      canArchive: false,
      canEdit: true,
      canEditCover: true,
      canPropose: false,
      canRestore: false,
      isReadOnly: false
    },
    proposal: {
      author: { name: 'Alex Morgan', userId: 'user-alex' },
      baseUpdatedAt: Date.UTC(2026, 7, 16),
      ideaName: 'coast-day',
      sourceTripId: 'source-1' as Id<'trips'>,
      status: 'draft'
    },
    role: 'organizer',
    startDate: null,
    totalDurationDays: 7,
    totalPlannedCost: 0,
    ...overrides
  } as TripDetail;
}

async function renderTrip(section: TripTabSection, trip: TripDetail = tripDetail()) {
  state.exists = true;
  state.trip = trip;
  return render(<TripDetailView section={section} tripId={trip.id} />);
}

const sharedPermissions = {
  canArchive: false,
  canEdit: false,
  canEditCover: false,
  canPropose: true,
  canRestore: false,
  isReadOnly: true
};

function sharedTrip(overrides: Partial<TripDetail> = {}) {
  return tripDetail({
    id: 'source-1' as Id<'trips'>,
    permissions: sharedPermissions,
    proposal: null,
    ...overrides
  });
}

beforeEach(() => {
  state.exists = true;
  state.proposals = [
    {
      author: { name: 'Alex Morgan', userId: 'user-alex' },
      id: 'proposal-1' as Id<'tripProposals'>,
      status: 'draft',
      title: 'Coast day',
      workingTripId: 'working-1'
    }
  ];
  state.trip = undefined;
  state.agentContext.mockClear();
  state.pollsRequested.length = 0;
  state.start.mockClear();
});

describe('TripDetailView working copies', () => {
  test.each(['plan', 'activity'] as const)(
    'redirects a working-trip idea on %s to the nested clone overview',
    async (section) => {
      await renderTrip(section);
      await expect
        .element(page.getByText('navigate:/trips/source-1/ideas/proposal-1/overview'))
        .toBeInTheDocument();
    }
  );
});

describe('TripDetailView shared trip', () => {
  test.each([
    ['plan', 'Plan', testIds.tripPlanPage, 'Plan section'],
    ['calendar', 'Calendar', undefined, 'Calendar section'],
    ['ideas', 'Ideas', undefined, 'idea queue section'],
    ['issues', 'Issues', undefined, 'issue queue section'],
    ['polls', 'Polls', undefined, 'poll queue section'],
    ['activity', 'Activity', testIds.tripHistoryPage, undefined]
  ] as const)(
    'renders the %s section under its page header and tells the assistant',
    async (section, title, bodyId, bodyText) => {
      const trip = sharedTrip();
      await renderTrip(section, trip);
      const heading = page.getByTestId(testIds.tripHeading);
      await expect.poll(() => heading.element().textContent).toBe(title);
      await expect.element(heading).toHaveAttribute('data-trip-name', 'Summer escape');
      if (bodyId) await expect.element(page.getByTestId(bodyId)).toBeInTheDocument();
      if (bodyText) await expect.element(page.getByText(bodyText)).toBeInTheDocument();
      expect(state.agentContext).toHaveBeenCalledWith(
        expect.objectContaining({ id: trip.id }),
        section,
        []
      );
    }
  );

  test('keeps the header mounted while the tab body changes', async () => {
    const trip = sharedTrip();
    state.exists = true;
    state.trip = trip;
    const view = await render(<TripDetailView section="plan" tripId={trip.id} />);
    const heading = page.getByTestId(testIds.tripHeading).element();
    await expect.element(page.getByText('Plan section')).toBeInTheDocument();
    await view.rerender(<TripDetailView section="issues" tripId={trip.id} />);
    await expect.element(page.getByText('issue queue section')).toBeInTheDocument();
    expect(page.getByTestId(testIds.tripHeading).element()).toBe(heading);
    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  test('remembers the shared trip it shows', async () => {
    const trip = sharedTrip();
    await renderTrip('plan', trip);
    expect(remember).toHaveBeenCalledWith(expect.objectContaining({ id: trip.id }));
  });

  test('fills the page only for the Calendar section and pads the rest', async () => {
    const area = (view: Awaited<ReturnType<typeof renderTrip>>) =>
      view.container.querySelector('[data-slot="trip-page-body"]');
    const calendar = await renderTrip('calendar', sharedTrip());
    expect(area(calendar)?.getAttribute('data-layout')).toBe('bleed');
    await calendar.unmount();
    const plan = await renderTrip('plan', sharedTrip());
    expect(area(plan)?.getAttribute('data-layout')).toBe('padded');
    await plan.unmount();
    const other = await renderTrip('ideas', sharedTrip());
    expect(area(other)?.getAttribute('data-layout')).toBe('padded');
  });

  test('pages in the polls once, only on the Polls section', async () => {
    const polls = await renderTrip('polls', sharedTrip());
    expect(state.pollsRequested.at(-1)).toBe('source-1');
    await polls.unmount();
    state.pollsRequested.length = 0;
    await renderTrip('issues', sharedTrip());
    expect(state.pollsRequested.every((requested) => requested === undefined)).toBe(true);
  });

  test.each(['plan', 'calendar'] as const)(
    'Suggest a change on %s starts an idea on the itinerary',
    async (section) => {
      await renderTrip(section, sharedTrip());
      await page.getByTestId(testIds.sharedTripNewIdea).click();
      expect(state.start).toHaveBeenCalledWith({ section: 'itinerary' });
    }
  );

  test('shows one loading status and no toolbar content while the trip loads', async () => {
    state.exists = undefined;
    state.trip = undefined;
    await render(<TripDetailView section="plan" tripId={'x' as Id<'trips'>} />);
    await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeInTheDocument();
    expect(page.getByRole('status').elements()).toHaveLength(1);
    await expect.element(page.getByTestId(testIds.tripHeading)).not.toBeInTheDocument();
  });
});

test('shows unpaid members the paywall without subscribing to planning data', async () => {
  await renderTrip('plan', sharedTrip({ canParticipate: false }));
  await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
  await expect.element(page.getByText('Payments for source-1')).toBeVisible();
  await expect.element(page.getByText('Plan section')).not.toBeInTheDocument();
  expect(state.agentContext).toHaveBeenLastCalledWith(undefined, 'plan', []);
});
