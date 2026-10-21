import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';
import { TripDetailView } from './trip-detail-view';

const state = vi.hoisted(() => ({
  agentContext: vi.fn(),
  exists: true as boolean | undefined,
  checkout: vi.fn(),
  paymentsEnabled: false,
  sourceArchived: false,
  sheetProps: vi.fn(),
  paymentsLoading: false,
  paymentTrips: vi.fn(),
  paid: false,
  free: false,
  versions: vi.fn(),
  issues: vi.fn(),
  proposals: undefined as unknown[] | undefined,
  start: vi.fn(),
  trip: undefined as TripDetail | undefined
}));

vi.mock('@/features/trips/hooks/use-trip-payments', () => ({
  useTripPayments: (tripId: unknown) => {
    state.paymentTrips(tripId);
    return {
      archived: state.sourceArchived,
      checkout: state.checkout,
      enabled: state.paymentsEnabled,
      isLoading: state.paymentsLoading,
      travelers: [{ userId: 'user-alex', paid: state.paid, free: state.free }]
    };
  }
}));

vi.mock('@/features/research/hooks/use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: false, researches: [] })
}));

vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrip: () => ({
    archive: vi.fn(),
    exists: state.exists,
    restore: vi.fn(),
    retryCover: vi.fn(),
    trip: state.trip,
    update: vi.fn()
  })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/trips/hooks/use-trip-versions')>()),
  useTripVersions: (...args: unknown[]) => {
    state.versions(...args);
    return { createVersion: vi.fn(), proposals: state.proposals };
  }
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
  useTripTravelers: () => ({
    goingCount: 3,
    isLoading: false,
    travelers: [{ userId: 'user-alex', name: 'Alex' }]
  })
}));

vi.mock('@/features/trips/trip-travelers/trip-travelers-sheet', () => ({
  TripTravelersSheet: (props: { open: boolean; archived: boolean; tripId: string }) => {
    state.sheetProps(props);
    return props.open ? <div>Roster open</div> : null;
  }
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: (...args: unknown[]) => {
    state.issues(...args);
    return { issues: [] };
  }
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

vi.mock('@/features/trips/trip-board/trip-board', () => ({
  TripBoard: () => <div>Board section</div>
}));

vi.mock('@/features/trips/trip-issues/trip-issues-panel', () => ({
  TripIssuesPanel: () => <div>Issues section</div>
}));

vi.mock('@/features/trips/trip-ideas/trip-ideas-panel', () => ({
  TripIdeasPanel: () => <div>Ideas section</div>
}));

vi.mock('@/features/trips/trip-destinations/trip-destinations-panel', () => ({
  TripDestinationsPanel: () => <div>Itinerary section</div>
}));

vi.mock('@/features/trips/trip-packing/trip-packing-panel', () => ({
  TripPackingPanel: () => <div>Packing list</div>
}));

vi.mock('@/features/trips/trip-detail/trip-details-editor', () => ({
  TripDetailsEditor: () => null
}));

function tripDetail(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    activity: [],
    archivedAt: null,
    arrivalTransfer: null,
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

async function renderTrip(section: TripSection, trip: TripDetail = tripDetail()) {
  state.exists = true;
  state.trip = trip;
  return render(<TripDetailView addDestinationOpen={false} section={section} tripId={trip.id} />);
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
  state.paymentsEnabled = false;
  state.sourceArchived = false;
  state.sheetProps.mockClear();
  state.paymentsLoading = false;
  state.paymentTrips.mockClear();
  state.paid = false;
  state.free = false;
  state.checkout = vi.fn().mockResolvedValue({ skipped: true, url: null });
  state.versions.mockClear();
  state.issues.mockClear();
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
  state.start.mockClear();
});

describe('TripDetailView payment access', () => {
  test('waits for payment status before subscribing to participating content', async () => {
    state.paymentsLoading = true;
    await renderTrip('board', sharedTrip());
    await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeVisible();
    expect(state.versions).not.toHaveBeenCalled();
    expect(state.issues).not.toHaveBeenCalled();
    expect(state.agentContext).not.toHaveBeenCalled();
  });

  test.each(['board', 'issues', 'ideas', 'research', 'polls', 'packing'] as const)(
    'shows payment access without mounting protected %s content',
    async (section) => {
      state.paymentsEnabled = true;
      await renderTrip(section, sharedTrip());
      await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
      await expect
        .element(page.getByRole('navigation', { name: 'Trip sections' }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
        .toBeEnabled();
      expect(state.versions).not.toHaveBeenCalled();
      expect(state.issues).not.toHaveBeenCalled();
      expect(state.agentContext).toHaveBeenCalledWith(undefined, 'board');
    }
  );

  test('opens travelers so an organizer can cover payment', async () => {
    state.paymentsEnabled = true;
    await renderTrip('board', sharedTrip());
    await page.getByRole('button', { name: 'Travelers', exact: true }).click();
    await expect.element(page.getByText('Roster open')).toBeVisible();
  });

  test('opens self checkout and unlocks participating content only after server confirmation', async () => {
    state.paymentsEnabled = true;
    const trip = sharedTrip();
    const view = await renderTrip('board', trip);
    await page.getByRole('button', { name: 'Pay €1 for your trip access' }).click();
    expect(state.checkout).toHaveBeenCalledWith('user-alex');
    await expect.element(page.getByText('Board section')).not.toBeInTheDocument();
    state.paid = true;
    await view.rerender(
      <TripDetailView addDestinationOpen={false} section="board" tripId={trip.id} />
    );
    await expect.element(page.getByText('Board section')).toBeInTheDocument();
  });

  test('keeps free creators and payment-disabled trips fully accessible', async () => {
    state.paymentsEnabled = true;
    state.free = true;
    await renderTrip('board', sharedTrip());
    await expect.element(page.getByText('Board section')).toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Join this trip' }))
      .not.toBeInTheDocument();
  });
});

describe('TripDetailView working copies', () => {
  test('locks working-copy checkout and roster controls when only the source trip is archived', async () => {
    state.paymentsEnabled = true;
    state.sourceArchived = true;
    const draft = tripDetail({ archivedAt: null });
    await renderTrip('overview', draft);
    await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
      .toBeDisabled();
    await expect
      .element(page.getByText('Payments are locked while this trip is archived.'))
      .toBeVisible();
    await page.getByRole('button', { name: 'Travelers', exact: true }).click();
    expect(state.sheetProps).toHaveBeenCalledWith(
      expect.objectContaining({
        archived: true,
        open: true,
        tripId: 'source-1'
      })
    );
    expect(state.checkout).not.toHaveBeenCalled();
  });
  test('requires source-trip payment before mounting a directly linked working copy', async () => {
    state.paymentsEnabled = true;
    await renderTrip('overview');
    await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
    expect(state.paymentTrips).toHaveBeenCalledWith('source-1');
    expect(state.paymentTrips).not.toHaveBeenCalledWith('working-1');
    expect(state.versions).not.toHaveBeenCalled();
    expect(state.issues).not.toHaveBeenCalled();
    await expect.element(page.getByText(/navigate:/u)).not.toBeInTheDocument();
  });

  test('waits for source-trip payment status before redirecting a working copy', async () => {
    state.paymentsLoading = true;
    await renderTrip('overview');
    await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeVisible();
    expect(state.paymentTrips).toHaveBeenCalledWith('source-1');
    expect(state.versions).not.toHaveBeenCalled();
  });
  test.each([
    ['overview', 'overview'],
    ['itinerary', 'itinerary'],
    ['board', 'overview'],
    ['activity', 'overview']
  ] as const)(
    'redirects a working-trip idea on %s to the nested clone %s view',
    async (section, view) => {
      await renderTrip(section);
      await expect
        .element(page.getByText(`navigate:/trips/source-1/ideas/proposal-1/${view}`))
        .toBeInTheDocument();
    }
  );
});

describe('TripDetailView shared trip', () => {
  test.each([
    ['board', undefined, 'Board section'],
    ['overview', testIds.tripPlanPage, 'Itinerary section'],
    ['issues', undefined, 'Issues section'],
    ['ideas', undefined, 'Ideas section'],
    ['activity', testIds.tripHistoryPage, undefined]
  ] as const)(
    'renders the %s tab under the toolbar and tells the assistant',
    async (section, bodyId, bodyText) => {
      const trip = sharedTrip();
      await renderTrip(section, trip);
      await expect
        .element(page.getByTestId(testIds.tripHeading))
        .toHaveTextContent('Summer escape');
      await expect.element(page.getByTestId(testIds.sharedTripBanner)).toBeInTheDocument();
      if (bodyId) await expect.element(page.getByTestId(bodyId)).toBeInTheDocument();
      if (bodyText) await expect.element(page.getByText(bodyText)).toBeInTheDocument();
      expect(state.agentContext).toHaveBeenCalledWith(
        expect.objectContaining({ id: trip.id }),
        section
      );
    }
  );

  test('shows the tabs under the cover with the board first and active', async () => {
    await renderTrip('board', sharedTrip());
    const tabs = page.getByRole('navigation', { name: 'Trip sections' });
    await expect.element(tabs).toBeVisible();
    await expect.element(page.getByTestId(testIds.tripSectionBoard)).toHaveClass('border-primary');
    await expect
      .element(page.getByTestId(testIds.tripSectionOverview))
      .not.toHaveClass('border-primary');
  });

  test('keeps the header mounted while the tab body changes', async () => {
    const trip = sharedTrip();
    state.exists = true;
    state.trip = trip;
    const view = await render(
      <TripDetailView addDestinationOpen={false} section="board" tripId={trip.id} />
    );
    const heading = page.getByTestId(testIds.tripHeading).element();
    const tabs = page.getByRole('navigation', { name: 'Trip sections' }).element();
    await expect.element(page.getByText('Board section')).toBeInTheDocument();
    await view.rerender(
      <TripDetailView addDestinationOpen={false} section="issues" tripId={trip.id} />
    );
    await expect.element(page.getByText('Issues section')).toBeInTheDocument();
    expect(page.getByTestId(testIds.tripHeading).element()).toBe(heading);
    expect(page.getByRole('navigation', { name: 'Trip sections' }).element()).toBe(tabs);
    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  test('keeps the board full-bleed and pads the other tabs', async () => {
    const view = await renderTrip('board', sharedTrip());
    const area = () => view.container.querySelector('[data-slot="trip-board-area"]');
    expect(area()?.className).toContain('px-0');
    await view.unmount();
    const other = await renderTrip('issues', sharedTrip());
    expect(other.container.querySelector('[data-slot="trip-board-area"]')?.className).toContain(
      'px-6'
    );
  });

  test('sends the planning-only itinerary page to the overview tab, keeping the day', async () => {
    const trip = sharedTrip();
    state.exists = true;
    state.trip = trip;
    await render(
      <TripDetailView addDestinationOpen={false} day={3} section="itinerary" tripId={trip.id} />
    );
    await expect
      .element(page.getByText('navigate:/trips/source-1/overview?day=3'))
      .toBeInTheDocument();
  });

  test('shows one loading status and no toolbar content while the trip loads', async () => {
    state.exists = undefined;
    state.trip = undefined;
    await render(
      <TripDetailView addDestinationOpen={false} section="board" tripId={'x' as Id<'trips'>} />
    );
    await expect.element(page.getByRole('status', { name: 'Loading trip…' })).toBeInTheDocument();
    expect(page.getByRole('status').elements()).toHaveLength(1);
    await expect.element(page.getByTestId(testIds.tripHeading)).not.toBeInTheDocument();
  });
});
