import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { render } from '@groam/vitest-config/react';
import { type ReactNode, useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueListItem, WorkspaceIssue } from '@/types/issues';
import type { TripBoardIssue } from '@/types/trip-board';
import type { TripBoardIdea } from '@/types/trip-board';
import type { Destination, TripActivity } from '@/types/trips';
import { TripBoard } from './trip-board';
import { TripBoardFullscreenToggle } from './trip-board-fullscreen-toggle';
import { applyIssueMove } from './trip-board-order';

const autoCondition = (
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
) =>
  ({
    check: 'destination',
    kind: 'auto',
    label: 'The trip has a destination',
    met,
    refusal
  }) satisfies IssueCondition;

const listItem = {
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  canAssign: true,
  canManage: true,
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  rank: 0,
  status: 'open',
  title: 'Coast day',
  updatedAt: Date.UTC(2026, 7, 17)
} satisfies Omit<IssueListItem, 'tripName'>;

const workspaceIssue = (over: Partial<WorkspaceIssue> = {}): WorkspaceIssue => ({
  ...listItem,
  body: 'Add a coast day near Lisbon.',
  closedAt: null,
  tripId: 'trip-1' as Id<'trips'>,
  tripName: 'Atlantic week',
  ...over
});

/** A board issue; `id` doubles as the title so tests can find the card by name. */
const boardIssue = (id: string, over: Partial<TripBoardIssue> = {}): TripBoardIssue =>
  workspaceIssue({ id: id as Id<'tripIssues'>, title: id, ...over });

const boardIdea = (id: string, over: Partial<TripBoardIdea> = {}): TripBoardIdea => ({
  author: { name: 'Sam', userId: 'user-sam' },
  baseUpdatedAt: 0,
  canApprove: false,
  canMerge: false,
  conflictCount: 0,
  feedbackCount: 0,
  hasApproved: false,
  id: id as Id<'tripProposals'>,
  ideaName: id,
  issueId: null,
  status: 'in_review',
  submittedAt: null,
  title: id,
  unresolvedFeedbackCount: 0,
  updatedAt: Date.now(),
  workingTripId: 'trip-work' as Id<'trips'>,
  ...over
});

function plannerActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    id: 'museum',
    sourceId: null,
    title: 'Explore the tile museum',
    dayNumber: 1,
    endDayNumber: 1,
    startTime: '10:00',
    endTime: '12:00',
    timeBlock: 'morning',
    address: 'Lisbon, Portugal',
    notes: 'Leave a little time for the courtyard café.',
    costAmount: 8,
    costSplit: 'per_person',
    attachments: [],
    transferToNext: null,
    ...overrides
  } as TripActivity;
}

function plannerDestination(overrides: Partial<Destination> = {}): Destination {
  return {
    id: 'lisbon',
    sourceId: null,
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    activities: [],
    stays: [],
    transferToNext: null,
    latitude: 38.72,
    longitude: -9.14,
    placeId: 'lisbon',
    position: 0,
    coverUrl: null,
    coverStatus: null,
    dayNotes: null,
    ...overrides
  } as Destination;
}

function plannerFixture(): TripDetail {
  const lisbon = plannerDestination({
    activities: [
      plannerActivity(),
      plannerActivity({
        id: 'alfama' as TripActivity['id'],
        title: 'Wander through Alfama',
        startTime: '14:00',
        endTime: '16:00',
        timeBlock: 'afternoon',
        notes: null,
        costAmount: null
      }),
      plannerActivity({
        id: 'dinner' as TripActivity['id'],
        title: 'Dinner by the river',
        startTime: '19:00',
        endTime: '20:30',
        timeBlock: 'evening',
        notes: null,
        costAmount: null
      })
    ],
    stays: [
      {
        id: 'hotel' as Destination['stays'][number]['id'],
        position: 0,
        sourceId: null,
        title: 'Casa do Pátio',
        address: 'Alfama, Lisbon',
        checkInDay: 1,
        checkOutDay: 2,
        checkInTime: '15:00',
        checkOutTime: '08:00',
        notes: 'Bags can be left at reception.',
        attachments: [],
        costAmount: 120,
        costSplit: 'total'
      } as Destination['stays'][number]
    ],
    transferToNext: {
      id: 'train' as NonNullable<Destination['transferToNext']>['id'],
      toDestinationId: 'porto' as Destination['id'],
      sourceId: null,
      mode: 'train',
      timing: { startDay: 2, endDay: 2, startTime: '09:00', endTime: '12:00' },
      durationMinutes: 180,
      costAmount: 30,
      costSplit: 'per_person',
      attachments: [],
      notes: 'Depart from Santa Apolónia station.'
    } as Destination['transferToNext']
  });
  const porto = plannerDestination({
    id: 'porto' as Destination['id'],
    name: 'Porto',
    startDay: 2,
    endDay: 3,
    activities: [
      plannerActivity({
        id: 'ribeira' as TripActivity['id'],
        title: 'Sunset along the Ribeira',
        dayNumber: 2,
        endDayNumber: 2,
        startTime: null,
        endTime: null,
        timeBlock: 'evening',
        address: 'Ribeira, Porto',
        notes: null,
        costAmount: null
      })
    ]
  });
  return {
    id: 'sample-trip',
    name: 'A few days in Portugal',
    currency: 'EUR',
    startDate: '2026-09-14',
    totalDurationDays: 3,
    destinations: [lisbon, porto],
    arrivalTransfer: null,
    departureTransfer: null,
    permissions: { canEdit: false, canPropose: true },
    proposal: null
  } as TripDetail;
}

const state = vi.hoisted(() => ({
  assign: vi.fn(),
  createVersion: vi.fn(),
  issues: undefined as unknown[] | undefined,
  listeners: new Set<() => void>(),
  merge: vi.fn(),
  move: vi.fn(),
  proposals: undefined as unknown[] | undefined
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useAction: () => state.merge,
  useMutation: () => Object.assign(state.move, { withOptimisticUpdate: () => state.move })
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    search,
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    to: string;
  }) => (
    <a
      {...rest}
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search ? `?${new URLSearchParams(search as Record<string, string>)}` : '')
      }
    >
      {children}
    </a>
  )
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } }),
  useWorkspace: () => ({
    activeOrganization: { members: [{ user: { name: 'Alex Traveler' }, userId: 'user-alex' }] },
    session: { user: { id: 'user-alex', name: 'Alex Traveler' } }
  })
}));

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: state.assign, setStatus: vi.fn() })
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({
    issues: useSyncExternalStore(
      (listener) => {
        state.listeners.add(listener);
        return () => state.listeners.delete(listener);
      },
      () => state.issues
    )
  })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useCreateTripVersion: () => state.createVersion,
  useTripVersions: () => ({ createVersion: state.createVersion, proposals: state.proposals })
}));

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => ({
    isLoading: false,
    items: [
      { id: 'p1', label: 'Passport', packed: true },
      { id: 'p2', label: 'Charger', packed: false }
    ]
  })
}));

vi.mock('@/features/issues/issue-list/create-issue-dialog', () => ({
  CreateIssueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-issue-stub">Create issue</div> : null
}));

function board(over: Record<string, unknown> = {}, onStartIdea?: () => void) {
  const trip = {
    ...plannerFixture(),
    groupMemberCount: 3,
    id: 'trip-1' as Id<'trips'>,
    initialBudget: 1500,
    permissions: { canPropose: true },
    ...over
  } as unknown as TripDetail;
  return <TripBoard onStartIdea={onStartIdea} trip={trip} />;
}

const lane = (name: RegExp) => page.getByRole('region', { name });

/** The liftable wrapper of the card titled `name`. */
const draggable = (name: string) =>
  page
    .getByTestId(testIds.tripBoardDraggable)
    .filter({ has: page.getByText(name, { exact: true }) });

async function lift(name: string) {
  await expect.element(draggable(name)).toBeVisible();
  draggable(name).element().focus();
  await userEvent.keyboard(' ');
  // Arrow keys only count once the lift has shown, which is when the keyboard sensor is listening.
  await expect.element(page.getByTestId(testIds.tripBoardDragPreview)).toBeVisible();
}

/** Lifts a card with Space, presses the keys, and drops it. */
async function dragWithKeyboard(name: string, keys: string[]) {
  await lift(name);
  for (const key of keys) await userEvent.keyboard(`{${key}}`);
  await userEvent.keyboard(' ');
}

beforeEach(() => {
  vi.clearAllMocks();
  state.issues = [];
  state.proposals = [];
  state.move.mockReset();
  state.move.mockResolvedValue(null);
  state.merge.mockResolvedValue('applied');
  state.createVersion.mockResolvedValue({ proposalId: 'proposal-2' });
});

describe('TripBoard layout', () => {
  test('shows six lanes, left to right, each saying what it is for', async () => {
    await render(board());
    const lanes = page.getByTestId(testIds.tripBoardLane);
    await expect
      .poll(() => lanes.elements().map((node) => node.getAttribute('data-lane')))
      .toEqual(['agreed', 'review', 'open', 'in_progress', 'closed', 'wont_do']);
    for (const [title, subtitle] of [
      ['Agreed plan', 'What the group has settled'],
      ['Ideas', null],
      ['To decide', 'Questions the group still has to settle'],
      ['In progress', null],
      ['Done', null],
      ["Won't do", null]
    ] as const) {
      await expect
        .element(page.getByRole('heading', { level: 2, name: new RegExp(`^${title}`, 'u') }))
        .toBeVisible();
      if (subtitle) await expect.element(page.getByText(subtitle, { exact: true })).toBeVisible();
    }
  });

  test('keeps every lane at one fixed width, empty or holding cards', async () => {
    state.issues = [
      boardIssue('Flights', { status: 'closed' }),
      boardIssue('Spa day', { status: 'wont_do' })
    ];
    await render(board());
    await expect.element(lane(/Done/).getByText('Flights')).toBeVisible();
    const lanes = page.getByTestId(testIds.tripBoardLane).elements();
    expect(lanes).toHaveLength(6);
    for (const node of lanes) expect(node.getBoundingClientRect().width).toBe(288);
    for (const [name, text] of [
      [/^Ideas/, /No ideas yet/],
      [/In progress/, /Nobody is on anything/]
    ] as const) {
      await expect.element(lane(name).getByText(text)).toBeVisible();
    }
  });

  test('lifting a card leaves the lanes where they are and tints the ones it may enter', async () => {
    state.issues = [boardIssue('Book hotel')];
    await render(board());
    const before = lane(/Done/).element().getBoundingClientRect().width;
    await lift('Book hotel');
    await expect.element(lane(/Done/)).toHaveAttribute('data-drop', 'allowed');
    expect(lane(/Done/).element().getBoundingClientRect().width).toBe(before);
    await userEvent.keyboard('{Escape}');
    await expect.element(lane(/Done/)).not.toHaveAttribute('data-drop', 'allowed');
  });

  test('scrolls sideways through a focusable region of lanes', async () => {
    await render(board());
    const scroller = page.getByRole('region', { name: 'Trip board lanes' }).element();
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    scroller.focus();
    expect(document.activeElement).toBe(scroller);
  });

  test('puts each issue in the lane of its status', async () => {
    state.issues = [
      boardIssue('Book hotel'),
      boardIssue('Find a guide', { status: 'in_progress' }),
      boardIssue('Flights', { status: 'closed' }),
      boardIssue('Spa day', { status: 'wont_do' })
    ];
    await render(board());
    for (const [name, card] of [
      [/To decide/, 'Book hotel'],
      [/In progress/, 'Find a guide'],
      [/Done/, 'Flights'],
      [/Won't do/, 'Spa day']
    ] as const) {
      await expect.element(lane(name).getByText(card)).toBeVisible();
      await expect.element(lane(name).getByText('1 card')).toBeInTheDocument();
    }
  });

  test('keeps rank order inside a lane', async () => {
    state.issues = [boardIssue('Second'), boardIssue('First')];
    await render(board());
    const cards = lane(/To decide/).getByTestId(testIds.issueCard);
    await expect.element(cards.nth(0).getByRole('link', { name: 'Second' })).toBeVisible();
    await expect.element(cards.nth(1).getByRole('link', { name: 'First' })).toBeVisible();
  });

  test('shows mandatory progress and condition lines', async () => {
    state.issues = [
      boardIssue('Visa', {
        condition: autoCondition(false),
        labels: ['mandatory']
      }),
      boardIssue('Flights', { labels: ['mandatory'], status: 'closed' })
    ];
    await render(board());
    await expect.element(lane(/To decide/).getByText('1 of 2 mandatory done')).toBeVisible();
    await expect.element(page.getByText('Needs a destination')).toBeVisible();
  });

  test('shows empty states', async () => {
    await render(board({ destinations: [] }));
    await expect.element(page.getByText(/Nothing to decide/)).toBeVisible();
    await expect.element(page.getByText(/Nothing agreed yet/)).toBeVisible();
  });

  test('links an issue card to its page', async () => {
    state.issues = [boardIssue('Book hotel')];
    await render(board());
    await expect
      .element(lane(/To decide/).getByRole('link', { name: 'Book hotel' }))
      .toHaveAttribute('href', '/issues/Book hotel');
  });
});

describe('TripBoard panning and fullscreen', () => {
  const scroller = () => page.getByRole('region', { name: 'Trip board lanes' });
  const dragAcross = (from: ReturnType<typeof scroller>, fromX: number, toX: number) => {
    const y = from.element().getBoundingClientRect().height - 8;
    return userEvent.dragAndDrop(from, from, {
      sourcePosition: { x: fromX, y },
      targetPosition: { x: toX, y }
    });
  };

  test('pans sideways when empty space is dragged', async () => {
    await render(board());
    expect(scroller().element().scrollLeft).toBe(0);
    await dragAcross(scroller(), 600, 300);
    await expect.poll(() => scroller().element().scrollLeft).toBeGreaterThan(100);
  });

  test('does not pan when the drag starts on a card', async () => {
    await render(board());
    const glance = lane(/Agreed plan/).getByRole('link', { name: /2 stops/u });
    await userEvent.dragAndDrop(glance, glance, {
      sourcePosition: { x: 80, y: 5 },
      targetPosition: { x: 10, y: 5 }
    });
    expect(scroller().element().scrollLeft).toBe(0);
  });

  test('offers full screen from the header and asks the browser for it', async () => {
    const request = vi.spyOn(document.documentElement, 'requestFullscreen').mockResolvedValue();
    await render(<TripBoardFullscreenToggle />);
    await page.getByTestId(testIds.tripBoardFullscreen).click();
    expect(request).toHaveBeenCalledOnce();
    request.mockRestore();
  });

  test('hides the full screen button where the browser has none', async () => {
    const enabled = vi.spyOn(document, 'fullscreenEnabled', 'get').mockReturnValue(false);
    await render(<TripBoardFullscreenToggle />);
    await expect.element(page.getByTestId(testIds.tripBoardFullscreen)).not.toBeInTheDocument();
    enabled.mockRestore();
  });
});

describe('TripBoard on a phone', () => {
  afterEach(async () => {
    await page.viewport(1280, 800);
  });

  test('switches lanes from pills that follow the lane in view', async () => {
    await page.viewport(390, 844);
    state.issues = [boardIssue('Book hotel')];
    await render(
      <>
        <TripBoardFullscreenToggle />
        {board()}
      </>
    );
    const tabs = page.getByTestId(testIds.tripBoardLaneTab);
    await expect.element(tabs.first()).toHaveAttribute('aria-current', 'true');
    await expect.element(page.getByTestId(testIds.tripBoardFullscreen)).not.toBeVisible();
    const target = tabs.filter({ hasText: 'In progress' });
    await target.click();
    await expect.element(target).toHaveAttribute('aria-current', 'true');
    expect(
      page.getByRole('region', { name: 'Trip board lanes' }).element().scrollLeft
    ).toBeGreaterThan(0);
  });

  test('shows how many cards each lane holds', async () => {
    await page.viewport(390, 844);
    state.issues = [boardIssue('Book hotel'), boardIssue('Flights')];
    await render(board());
    await expect
      .element(page.getByTestId(testIds.tripBoardLaneTab).filter({ hasText: 'To decide' }))
      .toHaveTextContent('To decide2');
  });
});

describe('TripBoard agreed plan', () => {
  test('summarises the trip, then groups the plan under day headings', async () => {
    await render(board());
    const agreed = lane(/Agreed plan/);
    await expect
      .element(agreed.getByRole('link', { name: /2 stops · Lisbon → Porto/u }))
      .toBeVisible();
    await expect.element(agreed.getByText(/1,500/u)).toBeVisible();
    await expect.element(agreed.getByText('1/2 packed')).toBeVisible();
    // The page header already says when, how long and with whom.
    await expect.element(agreed.getByText(/travelers?$/u)).not.toBeInTheDocument();
    const day1 = agreed.getByRole('region', { name: 'Day 1' });
    await expect.element(day1.getByRole('link', { name: 'Lisbon' })).toBeVisible();
    await expect.element(day1.getByText('Explore the tile museum')).toBeVisible();
    await expect
      .element(agreed.getByRole('region', { name: 'Day 2' }).getByText('Sunset along the Ribeira'))
      .toBeVisible();
  });

  test('links the glance, each card, and the footer to the plan page', async () => {
    await render(board());
    const agreed = lane(/Agreed plan/);
    await expect
      .element(agreed.getByRole('link', { name: 'Explore the tile museum' }))
      .toHaveAttribute('href', '/trips/trip-1/overview?day=1');
    await expect
      .element(agreed.getByRole('link', { name: 'Sunset along the Ribeira' }))
      .toHaveAttribute('href', '/trips/trip-1/overview?day=2');
    await expect
      .element(page.getByTestId(testIds.tripBoardPlanLink))
      .toHaveAttribute('href', '/trips/trip-1/overview');
  });

  test('glance links to the plan page even before any stop is planned', async () => {
    await render(board({ destinations: [] }));
    await expect
      .element(lane(/Agreed plan/).getByRole('link', { name: 'No stops yet' }))
      .toHaveAttribute('href', '/trips/trip-1/overview');
  });

  test('hides the budget when the trip has none', async () => {
    await render(board({ initialBudget: null }));
    await expect.element(page.getByText(/1,500/u)).not.toBeInTheDocument();
  });

  test('does not make agreed cards draggable', async () => {
    await render(board());
    await expect
      .element(lane(/Agreed plan/).getByTestId(testIds.tripBoardDraggable))
      .not.toBeInTheDocument();
  });
});

describe('TripBoard ideas and footers', () => {
  test('shows pending ideas with where they stand, and counts applied ones', async () => {
    state.proposals = [
      boardIdea('Beach day', { canMerge: true }),
      boardIdea('Museum', { status: 'merged' }),
      boardIdea('Hike', { canApprove: true })
    ];
    await render(board());
    const review = lane(/^Ideas/);
    await expect.element(review.getByText('Beach day')).toBeVisible();
    await expect.element(review.getByText('Ready to apply')).toBeVisible();
    await expect.element(review.getByText('Needs your vote')).toBeVisible();
    await expect.element(review.getByText('Museum')).not.toBeInTheDocument();
    await expect.element(review.getByText('1 applied')).toBeVisible();
  });

  test('says where an idea in review stands for the viewer', async () => {
    state.proposals = [
      boardIdea('Waiting', {}),
      boardIdea('Voted', { canApprove: true, hasApproved: true }),
      boardIdea('Stale', { status: 'conflicted' }),
      boardIdea('Mine', { author: { name: 'Alex', userId: 'user-alex' }, status: 'draft' })
    ];
    await render(board());
    const review = lane(/^Ideas/);
    await expect.element(review.getByText('Waiting for votes').first()).toBeVisible();
    await expect.element(review.getByText('Needs an update')).toBeVisible();
    await expect.element(review.getByText(/Your draft/u)).toBeVisible();
  });

  test('only lets ideas in review be lifted', async () => {
    state.proposals = [boardIdea('Beach day'), boardIdea('Draft idea', { status: 'draft' })];
    await render(board());
    await expect.element(draggable('Beach day')).toBeVisible();
    await expect.element(draggable('Draft idea')).not.toBeInTheDocument();
  });

  test('offers New idea with a handler and permission, and calls it', async () => {
    const onStartIdea = vi.fn();
    await render(board({}, onStartIdea));
    await page.getByTestId(testIds.startIdea).click();
    expect(onStartIdea).toHaveBeenCalledOnce();
  });

  test.each([
    ['a handler', board()],
    ['permission', board({ permissions: { canPropose: false } }, vi.fn())]
  ])('hides New idea without %s', async (_name, tree) => {
    await render(tree);
    await expect.element(lane(/^Ideas/)).toBeVisible();
    await expect.element(page.getByTestId(testIds.startIdea)).not.toBeInTheDocument();
  });

  test('opens the create issue dialog', async () => {
    await render(board());
    await page.getByTestId(testIds.newIssue).click();
    await expect.element(page.getByTestId('create-issue-stub')).toBeVisible();
  });

  test.each([
    ['Full history', testIds.tripHistory, '/trips/trip-1/activity'],
    ['All issues', testIds.issuesAll, '/trips/trip-1/issues'],
    ['All ideas', undefined, '/trips/trip-1/ideas']
  ] as const)('links %s', async (name, testId, href) => {
    await render(board());
    const link = testId ? page.getByTestId(testId) : page.getByRole('link', { name });
    await expect.element(link).toHaveAttribute('href', href);
  });
});

describe('TripBoard moves', () => {
  test('reorders within a lane with the neighbours it lands between', async () => {
    state.issues = [boardIssue('A'), boardIssue('B'), boardIssue('C')];
    await render(board());
    await dragWithKeyboard('C', ['ArrowUp']);
    await expect
      .poll(() => state.move.mock.calls)
      .toEqual([[{ afterIssueId: 'B', beforeIssueId: 'A', issueId: 'C', status: 'open' }]]);
  });

  test('reorders a Mandatory starter issue like any other card', async () => {
    state.issues = [
      boardIssue('A'),
      boardIssue('Visa', { labels: ['mandatory'] }),
      boardIssue('Flights', { labels: ['mandatory'] })
    ];
    await render(board());
    await dragWithKeyboard('Flights', ['ArrowUp']);
    await expect
      .poll(() => state.move.mock.calls)
      .toEqual([
        [{ afterIssueId: 'Visa', beforeIssueId: 'A', issueId: 'Flights', status: 'open' }]
      ]);
  });

  test('moves a card to the top of its lane', async () => {
    state.issues = [boardIssue('A'), boardIssue('B'), boardIssue('C')];
    await render(board());
    await dragWithKeyboard('C', ['ArrowUp', 'ArrowUp']);
    await expect
      .poll(() => state.move.mock.calls)
      .toEqual([[{ afterIssueId: 'A', beforeIssueId: undefined, issueId: 'C', status: 'open' }]]);
  });

  test('does nothing when a card is dropped where it was', async () => {
    state.issues = [boardIssue('A'), boardIssue('B')];
    await render(board());
    await dragWithKeyboard('A', []);
    await dragWithKeyboard('B', ['ArrowUp']);
    await expect
      .poll(() => state.move.mock.calls)
      .toEqual([[{ afterIssueId: 'A', beforeIssueId: undefined, issueId: 'B', status: 'open' }]]);
  });

  test('moving to In progress moves the card without opening a picker', async () => {
    state.issues = [boardIssue('Book hotel')];
    await render(board());
    await dragWithKeyboard('Book hotel', ['ArrowRight']);
    await expect
      .poll(() => state.move.mock.calls)
      .toEqual([
        [
          {
            afterIssueId: undefined,
            beforeIssueId: undefined,
            issueId: 'Book hotel',
            status: 'in_progress'
          }
        ]
      ]);
    await expect.element(page.getByTestId(testIds.issueAssigneePicker)).not.toBeInTheDocument();
  });

  test('keeps focus on a card moved to another lane by keyboard', async () => {
    const assignee = { kind: 'user', name: 'Sam', userId: 'user-sam' } as const;
    state.issues = [boardIssue('Book hotel', { assignee })];
    state.move.mockImplementation((args: Parameters<typeof applyIssueMove>[1]) => {
      state.issues = applyIssueMove(state.issues as TripBoardIssue[], args);
      for (const listener of state.listeners) listener();
      return Promise.resolve(null);
    });
    await render(board());
    await dragWithKeyboard('Book hotel', ['ArrowRight']);
    await expect
      .element(
        lane(/^In progress/)
          .getByTestId(testIds.tripBoardDraggable)
          .filter({ has: page.getByText('Book hotel', { exact: true }) })
      )
      .toBeVisible();
    await expect
      .poll(() => document.activeElement?.getAttribute('data-card-id'))
      .toBe('Book hotel');
  });

  test('moves a card to Done and to Won’t do', async () => {
    state.issues = [boardIssue('Book hotel')];
    await render(board());
    await dragWithKeyboard('Book hotel', ['ArrowRight', 'ArrowRight']);
    await expect.poll(() => state.move.mock.calls.at(-1)?.[0].status).toBe('closed');
    state.move.mockClear();
    await dragWithKeyboard('Book hotel', ['ArrowRight', 'ArrowRight', 'ArrowRight']);
    await expect.poll(() => state.move.mock.calls.at(-1)?.[0].status).toBe('wont_do');
  });

  test('refuses closing an issue that closes itself', async () => {
    state.issues = [
      boardIssue('Pick a destination', {
        condition: autoCondition(false)
      })
    ];
    await render(board());
    await lift('Pick a destination');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{ArrowRight}');
    await expect
      .element(
        lane(/Done/).getByTestId(testIds.tripBoardDropHint).getByText(autoCondition(false).refusal)
      )
      .toBeVisible();
    await userEvent.keyboard(' ');
    await expect
      .poll(() => vi.mocked(toast.info))
      .toHaveBeenCalledWith(autoCondition(false).refusal);
    expect(state.move).not.toHaveBeenCalled();
  });

  test('starts an idea from an issue dropped on Ideas', async () => {
    state.issues = [boardIssue('Book hotel')];
    await render(board());
    await dragWithKeyboard('Book hotel', ['ArrowLeft']);
    await expect.poll(() => state.createVersion.mock.calls).toEqual([[{ issueId: 'Book hotel' }]]);
  });

  test('applies an approved idea dragged to Agreed plan', async () => {
    state.proposals = [boardIdea('Beach day', { canMerge: true })];
    await render(board());
    await dragWithKeyboard('Beach day', ['ArrowLeft']);
    await expect.poll(() => state.merge.mock.calls).toEqual([[{ proposalId: 'Beach day' }]]);
  });

  test('refuses an idea that still needs approvals', async () => {
    state.proposals = [boardIdea('Beach day')];
    await render(board());
    await lift('Beach day');
    await userEvent.keyboard('{ArrowLeft}');
    await expect
      .element(
        page
          .getByTestId(testIds.tripBoardDropHint)
          .first()
          .getByText('Needs approvals before it can be applied')
      )
      .toBeVisible();
    await userEvent.keyboard(' ');
    await expect
      .poll(() => vi.mocked(toast.info))
      .toHaveBeenCalledWith('Needs approvals before it can be applied');
    expect(state.merge).not.toHaveBeenCalled();
  });

  test('cannot lift cards without rights', async () => {
    state.issues = [boardIssue('Book hotel', { canAssign: false, canManage: false })];
    await render(board({ permissions: { canPropose: false } }));
    await expect.element(draggable('Book hotel')).not.toBeInTheDocument();
  });

  test('cannot lift anything on an archived trip', async () => {
    state.issues = [boardIssue('Book hotel')];
    state.proposals = [boardIdea('Beach day')];
    await render(board({ archivedAt: Date.now() }));
    await expect.element(page.getByTestId(testIds.tripBoardDraggable)).not.toBeInTheDocument();
  });
});

describe('TripBoard handlers', () => {
  test('an unassigned card in progress shows no handler chip', async () => {
    state.issues = [boardIssue('Find a guide', { status: 'in_progress' })];
    await render(board());
    await expect
      .element(page.getByRole('button', { name: 'Pick who’s handling it' }))
      .not.toBeInTheDocument();
  });

  test('the assignee avatar opens the picker for anyone who can manage the issue', async () => {
    state.issues = [
      boardIssue('Book hotel', {
        assignee: { kind: 'user', name: 'Sam Planner', userId: 'user-sam' }
      })
    ];
    await render(board());
    await page.getByRole('button', { name: 'Assigned to Sam Planner' }).click();
    await expect.element(page.getByTestId(testIds.issueAssigneePicker)).toBeVisible();
  });

  test('an unassigned card outside In progress shows no avatar until hovered or focused', async () => {
    state.issues = [boardIssue('Book hotel')];
    await render(board());
    const reveal = () => getComputedStyle(trigger.element().parentElement!).opacity;
    const trigger = page.getByRole('button', { name: 'Assign someone' });
    expect(reveal()).toBe('0');
    trigger.element().focus();
    await expect.poll(reveal).toBe('1');
  });

  test('an unassigned card the viewer cannot manage renders nothing in the assignee slot', async () => {
    state.issues = [boardIssue('Book hotel', { canAssign: false, canManage: false })];
    await render(board());
    await expect.element(page.getByTitle('Unassigned')).not.toBeInTheDocument();
  });

  test('only organizers get the picker: a viewer who can manage but not assign sees the avatar', async () => {
    state.issues = [
      boardIssue('Book hotel', {
        assignee: { kind: 'user', name: 'Sam Planner', userId: 'user-sam' },
        canAssign: false
      })
    ];
    await render(board());
    await expect.element(page.getByTestId(testIds.tripBoardAssign)).not.toBeInTheDocument();
    await expect.element(page.getByRole('img', { name: 'Sam Planner' })).toBeInTheDocument();
  });
});
