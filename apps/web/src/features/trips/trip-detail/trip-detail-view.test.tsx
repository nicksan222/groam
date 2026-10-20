import type { Id } from '@groam/backend/data-model';
import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { cloneElement } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentRunView } from '@/features/agents/agent-run/agent-run-view';
import { DashboardSectionBoundary } from '@/features/dashboard/sections/dashboard-section-boundary';
import { DiscussionEntryView } from '@/features/discussions/discussion-thread/discussion-entry-view';
import { IdeaCloneView } from '@/features/ideas/idea-clone/idea-clone-view';
import { IdeaDetailView } from '@/features/ideas/idea-detail/idea-detail-view';
import { IssueDetailView } from '@/features/issues/issue-detail/issue-detail-view';
import { ResearchThreadView } from '@/features/research/research-thread/research-thread-view';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { testIds } from '@/lib/test-ids';
import { TripDetailView } from './trip-detail-view';

const state = vi.hoisted(() => ({
  reference: undefined as
    | undefined
    | null
    | { id: string; shortId: string; tripId?: Id<'trips'>; kind?: string; agentId?: string },
  metadataError: null as Error | null,
  entityContent: vi.fn(),
  runContent: vi.fn(),
  runStarts: vi.fn(),
  chatContent: vi.fn(),
  redirectMetadata: vi.fn(),
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

vi.mock('@groam/ai/ui/context/agent-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@groam/ai/ui/context/agent-context')>()),
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/agents/hooks/use-agent', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/agents/hooks/use-agent')>()),
  useAgentRecord: () => undefined
}));

vi.mock('@/features/agents/hooks/use-agent-run', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/agents/hooks/use-agent-run')>()),
  useAgentRun: () => {
    state.runContent();
    return undefined;
  },
  useAgentRunControls: () => ({ retry: vi.fn(), start: vi.fn(), stop: vi.fn() }),
  useAgentRunEvents: () => ({ events: [], loadMore: vi.fn(), status: 'Exhausted' }),
  useStartQueuedAssignRuns: () => state.runStarts()
}));

vi.mock('@/features/trips/hooks/use-entity-trip-reference', () => ({
  useEntityTripReference: () => {
    if (state.metadataError) throw state.metadataError;
    return state.reference;
  }
}));

vi.mock('@/features/research/hooks/use-research-chat-redirect', () => ({
  useResearchChatRedirect: () => {
    state.redirectMetadata();
    return null;
  }
}));

vi.mock('@/features/discussions/hooks/use-discussions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/discussions/hooks/use-discussions')>()),
  useDiscussions: () => {
    state.chatContent();
    return { discussions: [], isLoading: false };
  }
}));

vi.mock('@/features/issues/hooks/use-issues-agent-context', () => ({
  useIssueDetailAgentContext: () => undefined
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
  useTripVersion: () => {
    state.entityContent();
    return { proposal: null };
  },
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
  useTripIssue: () => {
    state.entityContent();
    return { issue: null };
  },
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
  state.metadataError = null;
  state.reference = undefined;
  state.entityContent.mockClear();
  state.runContent.mockClear();
  state.runStarts.mockClear();
  state.chatContent.mockClear();
  state.redirectMetadata.mockClear();
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
  test.each(['idea', 'research'] as const)(
    'protects a direct nested %s link with the real payment boundary',
    async (kind) => {
      state.paymentsEnabled = true;
      const trip = sharedTrip();
      state.trip = trip;
      state.reference = {
        id: 'entity-1',
        shortId: 'abcdef',
        tripId: trip.id,
        ...(kind === 'research' ? { kind: 'research' } : {})
      };
      await render(
        kind === 'idea' ? (
          <IdeaCloneView
            addDestinationOpen={false}
            proposalId={'idea-1' as Id<'tripProposals'>}
            sharedTripId={trip.id}
            view="overview"
          />
        ) : (
          <ResearchThreadView researchId={'research-1' as Id<'discussions'>} tripId={trip.id} />
        )
      );
      await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
      await expect
        .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
        .toBeEnabled();
      expect(state.versions).not.toHaveBeenCalled();
      expect(state.issues).not.toHaveBeenCalled();
      await page.getByRole('button', { name: 'Pay €1 for your trip access' }).click();
      expect(state.checkout).toHaveBeenCalledWith('user-alex');
      expect(state.paymentTrips.mock.calls.every(([tripId]) => tripId === trip.id)).toBe(true);
    }
  );
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

describe('standalone entity payment access', () => {
  test.each(['idea', 'issue'] as const)(
    '%s waits for routing metadata and handles missing links without content hooks',
    async (kind) => {
      const element =
        kind === 'idea' ? (
          <IdeaDetailView proposalId={'idea-1' as Id<'tripProposals'>} />
        ) : (
          <IssueDetailView issueId={'issue-1' as Id<'tripIssues'>} />
        );
      const view = await render(element);
      await expect.element(page.getByRole('status', { name: `Loading ${kind}…` })).toBeVisible();
      expect(state.entityContent).not.toHaveBeenCalled();
      state.reference = null;
      await view.rerender(cloneElement(element));
      await expect
        .element(page.getByText(`${kind === 'idea' ? 'Idea' : 'Issue'} not found`))
        .toBeVisible();
      expect(state.entityContent).not.toHaveBeenCalled();
    }
  );
  test.each(['idea', 'issue'] as const)(
    'a direct unpaid %s URL shows checkout before mounting protected hooks',
    async (kind) => {
      const trip = sharedTrip();
      state.trip = trip;
      state.paymentsEnabled = true;
      state.reference = { id: `${kind}-1`, shortId: 'abcdef', tripId: trip.id };
      const element =
        kind === 'idea' ? (
          <IdeaDetailView proposalId={'idea-1' as Id<'tripProposals'>} />
        ) : (
          <IssueDetailView issueId={'issue-1' as Id<'tripIssues'>} />
        );
      const view = await render(element);
      await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
      expect(state.entityContent).not.toHaveBeenCalled();
      await page.getByRole('button', { name: 'Pay €1 for your trip access' }).click();
      expect(state.checkout).toHaveBeenCalledWith('user-alex');
      expect(state.entityContent).not.toHaveBeenCalled();
      state.paid = true;
      await view.rerender(cloneElement(element));
      await expect
        .element(page.getByText(`${kind === 'idea' ? 'Idea' : 'Issue'} not found`))
        .toBeVisible();
      expect(state.entityContent).toHaveBeenCalled();
    }
  );
  test.each(['idea', 'issue'] as const)(
    'payment-disabled %s deep links mount their normal content',
    async (kind) => {
      const trip = sharedTrip();
      state.trip = trip;
      state.reference = { id: `${kind}-1`, shortId: 'abcdef', tripId: trip.id };
      await render(
        kind === 'idea' ? (
          <IdeaDetailView proposalId={'idea-1' as Id<'tripProposals'>} />
        ) : (
          <IssueDetailView issueId={'issue-1' as Id<'tripIssues'>} />
        )
      );
      await expect
        .element(page.getByText(`${kind === 'idea' ? 'Idea' : 'Issue'} not found`))
        .toBeVisible();
      expect(state.entityContent).toHaveBeenCalled();
    }
  );
});

test('trip-linked chat deep links resolve and gate participation before redirect or thread hooks', async () => {
  const trip = sharedTrip();
  state.trip = trip;
  state.paymentsEnabled = true;
  const element = <DiscussionEntryView discussionId={'chat-1' as Id<'discussions'>} />;
  const view = await render(element);
  await expect.element(page.getByRole('status', { name: 'Opening chat…' })).toBeVisible();
  expect(state.chatContent).not.toHaveBeenCalled();
  expect(state.redirectMetadata).not.toHaveBeenCalled();
  state.reference = { id: 'chat-1', shortId: 'abcdef', tripId: trip.id };
  await view.rerender(cloneElement(element));
  await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
  expect(state.chatContent).not.toHaveBeenCalled();
  expect(state.redirectMetadata).not.toHaveBeenCalled();
  state.paid = true;
  await view.rerender(cloneElement(element));
  await expect.element(page.getByText('Chat not found')).toBeVisible();
  expect(state.chatContent).toHaveBeenCalled();
  expect(state.redirectMetadata).toHaveBeenCalled();
});

test('ordinary non-trip chats retain their normal entry without a trip subscription', async () => {
  state.reference = { id: 'chat-1', shortId: 'abcdef' };
  await render(<DiscussionEntryView discussionId={'chat-1' as Id<'discussions'>} />);
  await expect.element(page.getByText('Chat not found')).toBeVisible();
  expect(state.chatContent).toHaveBeenCalled();
  expect(state.paymentTrips).not.toHaveBeenCalled();
});

test('standalone agent-run links gate protected run hooks and auto-starts before participation', async () => {
  const trip = sharedTrip();
  state.trip = trip;
  state.paymentsEnabled = true;
  const element = <AgentRunView agentId="issue" runId="run-1" />;
  const view = await render(element);
  await expect.element(page.getByRole('status', { name: 'Loading run…' })).toBeVisible();
  expect(state.runContent).not.toHaveBeenCalled();
  state.reference = { id: 'run-1', shortId: 'abcdef', agentId: 'issue', tripId: trip.id };
  await view.rerender(cloneElement(element));
  await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
  expect(state.runContent).not.toHaveBeenCalled();
  expect(state.runStarts).not.toHaveBeenCalled();
  state.paid = true;
  await view.rerender(cloneElement(element));
  await expect.element(page.getByRole('status', { name: 'Loading run…' })).toBeVisible();
  expect(state.runContent).toHaveBeenCalled();
  expect(state.runStarts).toHaveBeenCalled();
});

test('non-trip agent-run links retain normal content while missing references stay outside', async () => {
  state.reference = null;
  const element = <AgentRunView agentId="groam" runId="run-1" />;
  const view = await render(element);
  await expect.element(page.getByText('Run not found')).toBeVisible();
  expect(state.runContent).not.toHaveBeenCalled();
  state.reference = { id: 'run-1', shortId: 'abcdef', agentId: 'groam' };
  await view.rerender(cloneElement(element));
  await expect.element(page.getByRole('status', { name: 'Loading run…' })).toBeVisible();
  expect(state.runContent).toHaveBeenCalled();
  expect(state.paymentTrips).not.toHaveBeenCalled();
});

test.each(['idea', 'research'] as const)(
  'a mixed-trip nested %s URL never offers checkout for either trip',
  async (kind) => {
    const trip = sharedTrip();
    state.trip = trip;
    state.paymentsEnabled = true;
    state.reference = {
      id: 'entity-b',
      shortId: 'abcdef',
      tripId: 'trip-b' as Id<'trips'>,
      ...(kind === 'research' ? { kind: 'research' } : {})
    };
    await render(
      kind === 'idea' ? (
        <IdeaCloneView
          addDestinationOpen={false}
          proposalId={'entity-b' as Id<'tripProposals'>}
          sharedTripId={trip.id}
          view="overview"
        />
      ) : (
        <ResearchThreadView researchId={'entity-b' as Id<'discussions'>} tripId={trip.id} />
      )
    );
    await expect
      .element(page.getByText(kind === 'idea' ? 'Idea not found' : 'Research not found'))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
      .not.toBeInTheDocument();
    expect(state.paymentTrips).not.toHaveBeenCalled();
    expect(state.checkout).not.toHaveBeenCalled();
    expect(state.entityContent).not.toHaveBeenCalled();
    expect(state.versions).not.toHaveBeenCalled();
  }
);

test.each(['idea', 'research'] as const)(
  'a nested %s metadata error reaches the error boundary without checkout or protected content',
  async (kind) => {
    state.metadataError = new Error('metadata unavailable');
    state.paymentsEnabled = true;
    expectConsole('error', /metadata unavailable/u);
    await render(
      <DashboardSectionBoundary fallback={<p>Link could not be loaded</p>}>
        {kind === 'idea' ? (
          <IdeaCloneView
            addDestinationOpen={false}
            proposalId={'entity-b' as Id<'tripProposals'>}
            sharedTripId={'source-1' as Id<'trips'>}
            view="overview"
          />
        ) : (
          <ResearchThreadView
            researchId={'entity-b' as Id<'discussions'>}
            tripId={'source-1' as Id<'trips'>}
          />
        )}
      </DashboardSectionBoundary>
    );
    await expect.element(page.getByText('Link could not be loaded')).toBeVisible();
    expect(state.paymentTrips).not.toHaveBeenCalled();
    expect(state.checkout).not.toHaveBeenCalled();
    expect(state.entityContent).not.toHaveBeenCalled();
  }
);

test('valid working-copy research retains its canonical source payment and archive lock', async () => {
  state.trip = tripDetail();
  state.paymentsEnabled = true;
  state.sourceArchived = true;
  state.reference = {
    id: 'research-1',
    shortId: 'abcdef',
    tripId: state.trip.id,
    kind: 'research'
  };
  await render(
    <ResearchThreadView researchId={'research-1' as Id<'discussions'>} tripId={state.trip.id} />
  );
  await expect.element(page.getByRole('heading', { name: 'Join this trip' })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
    .toBeDisabled();
  expect(state.paymentTrips).toHaveBeenCalledWith('source-1');
  expect(state.paymentTrips).not.toHaveBeenCalledWith('working-1');
  expect(state.checkout).not.toHaveBeenCalled();
});

test.each(['reviewer', 'removed-agent'])(
  'a wrong or stale agent %s cannot offer checkout for an existing trip run',
  async (agentId) => {
    const trip = sharedTrip();
    state.trip = trip;
    state.paymentsEnabled = true;
    state.reference = { id: 'run-1', shortId: 'abcdef', agentId: 'issue', tripId: trip.id };
    await render(<AgentRunView agentId={agentId} runId="run-1" />);
    await expect
      .element(page.getByText(agentId === 'removed-agent' ? 'Agent not found' : 'Run not found'))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
      .not.toBeInTheDocument();
    expect(state.paymentTrips).not.toHaveBeenCalled();
    expect(state.checkout).not.toHaveBeenCalled();
    expect(state.runContent).not.toHaveBeenCalled();
    expect(state.runStarts).not.toHaveBeenCalled();
  }
);

test('missing agent metadata cannot bypass pair validation for non-trip runs', async () => {
  state.reference = { id: 'run-1', shortId: 'abcdef' };
  await render(<AgentRunView agentId="groam" runId="run-1" />);
  await expect.element(page.getByText('Run not found')).toBeVisible();
  expect(state.paymentTrips).not.toHaveBeenCalled();
  expect(state.runContent).not.toHaveBeenCalled();
  expect(state.runStarts).not.toHaveBeenCalled();
});
