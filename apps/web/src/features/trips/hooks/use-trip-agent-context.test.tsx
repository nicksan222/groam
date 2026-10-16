import { AgentContextProvider, useCurrentAgentContext } from '@groam/ai/ui/context/agent-context';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { tripSectionLabels } from '@/features/trips/trip-sections';
import type { TripAgentView } from '@/types/trips';
import {
  ideaCompareAgentContext,
  tripScreenAgentContext,
  useTripAgentContext
} from './use-trip-agent-context';
import type { TripDetail } from './use-trips';

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

const sharedBoard = { ...trip, permissions: { ...trip.permissions, canEdit: false } };
const proposalTrip = { ...trip, proposal: { status: 'draft' } } as unknown as TripDetail;
const archivedBoard = { ...sharedBoard, archivedAt: Date.now() } as TripDetail;

test.each(['activity', 'board', 'ideas', 'issues', 'itinerary', 'overview'] as const)(
  'builds explicit screen data for the %s section',
  (section) => {
    const context = tripScreenAgentContext(trip, section);
    expect(context.key).toBe(`trip:trip-1:${section}`);
    expect(context.title).toBe(`Portugal · ${tripSectionLabels[section]}`);
    expect(context.data).toBeDefined();
    // The assistant backend has no "board" section yet, so the board reports "overview".
    expect(context.target).toEqual({
      kind: 'trip',
      section: section === 'board' ? 'overview' : section,
      tripId: 'trip-1'
    });
  }
);

test.each([
  ['shared itinerary for editors', trip, 'itinerary', ['trip.packing.read', 'trip.activity.add']],
  ['proposal itinerary', proposalTrip, 'itinerary', ['trip.itinerary.read']],
  ['shared board', sharedBoard, 'board', ['trip.traveler.set', 'trip.version.approve']],
  ['archived board', archivedBoard, 'board', ['trip.version.apply']],
  ['ideas tab', sharedBoard, 'ideas', ['trip.version.approve', 'trip.version.apply']],
  ['issues tab', sharedBoard, 'issues', ['trip.itinerary.read']],
  ['shared overview', sharedBoard, 'overview', ['trip.packing.read']],
  ['proposal overview', proposalTrip, 'overview', ['trip.packing.manage']]
] as const)('grants the capabilities of the %s', (_name, subject, section, expected) => {
  expect(tripScreenAgentContext(subject, section).capabilities).toEqual(
    expect.arrayContaining([...expected])
  );
});

describe('capability limits', () => {
  test('archived boards cannot set travelers', () => {
    expect(tripScreenAgentContext(archivedBoard, 'board').capabilities).not.toContain(
      'trip.traveler.set'
    );
  });

  test('proposal itineraries leave out shared-trip packing reads', () => {
    expect(tripScreenAgentContext(proposalTrip, 'itinerary').capabilities).not.toContain(
      'trip.packing.read'
    );
  });

  test('read-only viewers get no editing capabilities on the plan', () => {
    expect(tripScreenAgentContext(sharedBoard, 'itinerary').capabilities).not.toContain(
      'trip.activity.add'
    );
  });
});

test('the board carries travelers, ideas, and open issues', () => {
  const context = tripScreenAgentContext(sharedBoard, 'board', {
    ideas: [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }],
    openIssues: [{ id: 'issue-1', title: 'Book flights' }],
    travelers: [{ name: 'Alex', status: 'going', userId: 'user-alex' }]
  });
  expect(context.title).toBe('Portugal · Board');
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
      <TripRegistration section="board" />
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

test('the issues and ideas tabs each carry their own data', () => {
  const extras = {
    ideas: [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }],
    openIssues: [{ id: 'issue-1', title: 'Book flights' }]
  };
  expect(tripScreenAgentContext(sharedBoard, 'issues', extras).data).toMatchObject({
    openIssues: extras.openIssues
  });
  expect(tripScreenAgentContext(sharedBoard, 'ideas', extras).data).toMatchObject({
    ideas: extras.ideas
  });
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
