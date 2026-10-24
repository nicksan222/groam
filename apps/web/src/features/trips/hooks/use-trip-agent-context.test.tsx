import { AgentContextProvider, useCurrentAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ideaViewTitles } from '@/features/ideas/idea-clone/idea-sections';
import { isTripSection, tripSectionTitle } from '@/features/trips/trip-sections';
import type { TripAgentView } from '@/types/trips';
import { ideaCompareAgentContext } from './idea-compare-agent-context';
import { tripScreenAgentContext, useTripAgentContext } from './use-trip-agent-context';
import type { TripDetail } from './use-trips';

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({
    discussions: [
      { id: 'chat-1', lastMessage: { text: 'Hello' }, title: 'Dinner', tripId: 'trip-1' },
      { id: 'chat-2', lastMessage: null, title: 'Elsewhere', tripId: 'other' }
    ],
    isLoading: false
  })
}));
vi.mock('@/features/polls/hooks/use-polls', () => ({
  useTripPolls: () => ({ isLoading: false, polls: [] })
}));

vi.mock('@/features/research/hooks/use-trip-researches', () => ({
  useTripResearches: () => ({ isLoading: false, researches: [] })
}));

vi.mock('./use-trip-versions', () => ({
  useTripVersions: (_tripId: unknown, enabled = true) => ({
    proposals: enabled
      ? [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }]
      : undefined
  })
}));

vi.mock('./use-trip-issues', () => ({
  useTripIssues: (_tripId: unknown, enabled = true) => ({
    issues: enabled ? [{ id: 'issue-1', status: 'open', title: 'Book flights' }] : undefined
  })
}));

vi.mock('./use-trip-packing', () => ({
  useTripPacking: (tripId: unknown) => ({
    isLoading: false,
    items: tripId
      ? [
          {
            bringers: [{ count: 1, image: null, name: 'Alex', userId: 'user-alex' }],
            brought: 1,
            id: 'item-1',
            label: 'Hair dryer',
            quantity: 3
          }
        ]
      : []
  })
}));
vi.mock('./use-trip-travelers', () => ({
  useTripTravelers: (tripId: unknown) => ({
    travelers: tripId ? [{ name: 'Alex', status: 'going', userId: 'user-alex' }] : []
  })
}));

const id = <Table extends 'tripDestinationActivities' | 'tripDestinations' | 'trips'>(
  value: string
) => value as Id<Table>;

const trip = {
  activity: [
    {
      actorName: 'Alex',
      message: 'Alex added the museum',
      type: 'itinerary_activity_added'
    }
  ],
  archivedAt: null,
  departureTransfer: null,
  destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
  destinations: [
    {
      activities: [
        {
          dayNumber: 2,
          endDayNumber: 2,
          id: id<'tripDestinationActivities'>('activity-1'),
          timeBlock: 'morning',
          title: 'Museum',
          transferToNext: null
        }
      ],
      endDay: 4,
      id: id<'tripDestinations'>('destination-1'),
      name: 'Lisbon',
      startDay: 2,
      transferToNext: null
    }
  ],
  groupMemberCount: 4,
  id: id<'trips'>('trip-1'),
  name: 'Portugal',
  permissions: { canEdit: true },
  role: 'organizer',
  startDate: '2027-05-10',
  totalDurationDays: 7
} as unknown as TripDetail;

function TripRegistration({ section }: { section: TripAgentView }) {
  useTripAgentContext(trip, section);
  return null;
}

function Probe() {
  const context = useCurrentAgentContext();
  return <output aria-label="Trip agent context">{JSON.stringify(context)}</output>;
}

const sharedPlan = { ...trip, permissions: { ...trip.permissions, canEdit: false } };
const proposalTrip = { ...trip, proposal: { status: 'draft' } } as unknown as TripDetail;
const archivedPlan = { ...sharedPlan, archivedAt: Date.now() } as TripDetail;

test.each([
  'activity',
  'calendar',
  'ideas',
  'issues',
  'itinerary',
  'overview',
  'packing',
  'plan',
  'polls'
] as const)('builds explicit screen data for the %s section', (section) => {
  const context = tripScreenAgentContext(trip, section);
  expect(context.key).toBe(`trip:trip-1:${section}`);
  expect(context.title).toBe(
    `Portugal · ${isTripSection(section) ? tripSectionTitle(section) : ideaViewTitles[section]}`
  );
  expect(context.data).toBeDefined();
  // The assistant backend has no "plan" section yet, so Plan reports "overview".
  expect(context.target).toEqual({
    kind: 'trip',
    section:
      section === 'plan' || section === 'calendar' || section === 'polls' || section === 'packing'
        ? 'overview'
        : section,
    tripId: 'trip-1'
  });
});

test('the calendar reads the plan by day and time and never edits it', () => {
  const context = tripScreenAgentContext(trip, 'calendar');
  expect(context.capabilities).toEqual(['trip.status.read', 'trip.itinerary.read']);
  expect(context.description).toMatch(/calendar/u);
  expect(context.data).toMatchObject({ startDate: trip.startDate });
});

test('Plan reads the plan day by day and says what still waits on the group', () => {
  const context = tripScreenAgentContext(sharedPlan, 'plan');
  expect(context.description).toMatch(/day by day/u);
  expect(context.data).not.toHaveProperty('view');
});

test('the Ideas section carries the ideas and the means to review them', () => {
  const ideas = [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }];
  const context = tripScreenAgentContext(trip, 'ideas', { ideas });
  expect(context.capabilities).toEqual([
    'trip.status.read',
    'trip.itinerary.read',
    'trip.version.approve',
    'trip.version.apply'
  ]);
  expect(context.data).toMatchObject({ ideas });
  // Ideas keep the vocabulary stored on agent runs.
  expect(context.target).toEqual({ kind: 'trip', section: 'ideas', tripId: 'trip-1' });
});

test('the Issues section carries the open issues', () => {
  const openIssues = [{ id: 'issue-1', title: 'Book flights' }];
  const context = tripScreenAgentContext(trip, 'issues', { openIssues });
  expect(context.data).toMatchObject({ openIssues });
  expect(context.target).toEqual({ kind: 'trip', section: 'issues', tripId: 'trip-1' });
});

test('the Polls section carries the polls and targets overview', () => {
  const polls = [
    { eligibleCount: 3, id: 'p1', question: 'Dinner?', status: 'open', votedCount: 1 }
  ];
  const context = tripScreenAgentContext(trip, 'polls', { polls });
  expect(context.capabilities).toContain('poll.create');
  expect(context.data).toMatchObject({ polls });
  expect(tripScreenAgentContext(trip, 'polls').data).toMatchObject({ polls: [] });
  expect(context.target).toEqual({ kind: 'trip', section: 'overview', tripId: 'trip-1' });
});

test('an archived trip cannot create polls from the Polls section', () => {
  const capabilities = tripScreenAgentContext(archivedPlan, 'polls').capabilities;
  expect(capabilities).not.toContain('poll.create');
  expect(capabilities).toContain('trip.status.read');
});

test.each([
  ['shared itinerary for editors', trip, 'itinerary', ['trip.packing.read', 'trip.activity.add']],
  ['proposal itinerary', proposalTrip, 'itinerary', ['trip.itinerary.read']],
  ['shared plan', sharedPlan, 'plan', ['trip.traveler.set', 'trip.version.approve']],
  ['archived plan', archivedPlan, 'plan', ['trip.version.apply', 'trip.packing.read']],
  ['ideas tab', sharedPlan, 'ideas', ['trip.version.approve', 'trip.version.apply']],
  ['shared packing', sharedPlan, 'packing', ['trip.packing.read']],
  ['proposal packing', proposalTrip, 'packing', ['trip.packing.manage']]
] as const)('grants the capabilities of the %s', (_name, subject, section, expected) => {
  expect(tripScreenAgentContext(subject, section).capabilities).toEqual(
    expect.arrayContaining([...expected])
  );
});

test('the packing section reports group gear coverage and never a personal list', () => {
  const packing = [
    {
      bringers: [{ count: 1, name: 'Alex', userId: 'user-alex' }],
      brought: 1,
      id: 'item-1',
      label: 'Hair dryer',
      quantity: 3
    }
  ];
  const travelers = [{ name: 'Alex', status: 'going', userId: 'user-alex' }];
  const context = tripScreenAgentContext(sharedPlan, 'packing', { packing, travelers });
  expect(context.data).toMatchObject({ groupGear: [{ label: 'Hair dryer', missing: 2 }] });
  expect(context.data).toMatchObject({
    needsIdeaToEdit: true,
    personalList: { privateToViewer: true },
    travelers,
    viewerCanEdit: false
  });
  expect(JSON.stringify(context.data)).not.toContain('Charger');
  expect(
    tripScreenAgentContext(proposalTrip, 'packing', { packing, travelers }).data
  ).toMatchObject({ needsIdeaToEdit: false, viewerCanEdit: true });
  expect(context.capabilities).not.toContain('trip.packing.manage');
});

describe('capability limits', () => {
  test('the overview no longer carries packing capabilities', () => {
    expect(tripScreenAgentContext(proposalTrip, 'overview').capabilities).not.toContain(
      'trip.packing.manage'
    );
  });

  test('archived plans cannot set travelers', () => {
    expect(tripScreenAgentContext(archivedPlan, 'plan').capabilities).not.toContain(
      'trip.traveler.set'
    );
  });

  test('proposal itineraries leave out shared-trip packing reads', () => {
    expect(tripScreenAgentContext(proposalTrip, 'itinerary').capabilities).not.toContain(
      'trip.packing.read'
    );
  });

  test('read-only viewers get no editing capabilities on the plan', () => {
    expect(tripScreenAgentContext(sharedPlan, 'itinerary').capabilities).not.toContain(
      'trip.activity.add'
    );
  });
});

test('Plan carries travelers, ideas, and open issues', () => {
  const context = tripScreenAgentContext(sharedPlan, 'plan', {
    ideas: [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }],
    openIssues: [{ id: 'issue-1', title: 'Book flights' }],
    travelers: [{ name: 'Alex', status: 'going', userId: 'user-alex' }]
  });
  expect(context.title).toBe('Portugal · Plan');
  expect(context.data).toMatchObject({
    ideas: [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }],
    openIssues: [{ id: 'issue-1', title: 'Book flights' }],
    travelers: [{ name: 'Alex', status: 'going', userId: 'user-alex' }]
  });
});

test('forwards live trip section changes through the shared agent context hook', async () => {
  const context = () => page.getByRole('status', { name: 'Trip agent context' }).element();
  const view = await render(
    <AgentContextProvider>
      <TripRegistration section="plan" />
      <Probe />
    </AgentContextProvider>
  );
  expect(context().textContent).toContain('Book flights');

  await view.rerender(
    <AgentContextProvider>
      <TripRegistration section="itinerary" />
      <Probe />
    </AgentContextProvider>
  );
  expect(context().textContent).toContain('trip.activity.add');
  expect(context().textContent).not.toContain('user-alex');
});

test('the live Calendar section reads the plan with its travelers', async () => {
  await render(
    <AgentContextProvider>
      <TripRegistration section="calendar" />
      <Probe />
    </AgentContextProvider>
  );
  const text = page.getByRole('status', { name: 'Trip agent context' }).element().textContent;
  expect(text).toContain('Portugal · Calendar');
  expect(text).toContain('user-alex');
});

test.each([
  ['ideas', 'Lisbon proposal'],
  ['issues', 'Book flights'],
  ['polls', 'poll.create']
] as const)('the live %s section subscribes to its own list', async (section, expected) => {
  await render(
    <AgentContextProvider>
      <TripRegistration section={section} />
      <Probe />
    </AgentContextProvider>
  );
  expect(page.getByRole('status', { name: 'Trip agent context' }).element().textContent).toContain(
    expected
  );
});

test('the live packing tab forwards group gear with bringers and travelers', async () => {
  const context = () => page.getByRole('status', { name: 'Trip agent context' }).element();
  await render(
    <AgentContextProvider>
      <TripRegistration section="packing" />
      <Probe />
    </AgentContextProvider>
  );
  expect(context().textContent).toContain('Hair dryer');
  expect(context().textContent).toContain('user-alex');
  expect(context().textContent).toContain('trip.packing.read');
});

test('the idea compare screen reports ideas and idea review capabilities', async () => {
  const ideas = [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }];
  const context = ideaCompareAgentContext(trip, ideas);
  expect(context.title).toBe('Portugal · Ideas');
  expect(context.target).toEqual({ kind: 'trip', section: 'ideas', tripId: 'trip-1' });
  expect(context.capabilities).toEqual(expect.arrayContaining(['trip.version.apply']));
  expect(context.data).toMatchObject({ ideas });

  await render(
    <AgentContextProvider>
      <TripRegistration section="idea-compare" />
      <Probe />
    </AgentContextProvider>
  );
  expect(page.getByRole('status', { name: 'Trip agent context' }).element().textContent).toContain(
    'proposal-lisbon'
  );
});
