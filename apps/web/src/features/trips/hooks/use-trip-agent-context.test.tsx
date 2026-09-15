import type { Id } from '@groam/backend/data-model';
import { AgentContextProvider, useCurrentAgentContext } from '@groam/ui/ai/context/agent-context';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { tripScreenAgentContext, useTripAgentContext } from './use-trip-agent-context';
import type { TripDetail } from './use-trips';

vi.mock('./use-trip-versions', () => ({
  useTripVersions: (_tripId: unknown, enabled = true) => ({
    proposals: enabled
      ? [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }]
      : undefined
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

function TripRegistration({ section }: { section: 'itinerary' | 'overview' | 'ideas' }) {
  useTripAgentContext(trip, section);
  return null;
}

function Probe() {
  const context = useCurrentAgentContext();
  return <output aria-label="Trip agent context">{JSON.stringify(context)}</output>;
}

afterEach(cleanup);

test('builds explicit screen data and capabilities for every trip section', () => {
  const sections = ['activity', 'issues', 'itinerary', 'overview', 'ideas'] as const;
  for (const section of sections) {
    const context = tripScreenAgentContext(trip, section);
    expect(context.key).toBe(`trip:trip-1:${section}`);
    expect(context.title).toContain('Portugal');
    expect(context.data).toBeDefined();
    expect(context.target).toEqual({ kind: 'trip', section, tripId: 'trip-1' });
  }
  expect(tripScreenAgentContext(trip, 'itinerary').capabilities).toEqual([
    'trip.status.read',
    'trip.itinerary.read',
    'web.search',
    'trip.activity.add',
    'trip.activity.remove',
    'trip.activity.update',
    'trip.cost.manage',
    'trip.destination.add',
    'trip.destination.remove',
    'trip.destination.schedule',
    'trip.details.update',
    'trip.itinerary.extend',
    'trip.stay.add',
    'trip.stay.remove',
    'trip.stay.update',
    'trip.transfer.remove',
    'trip.transfer.set'
  ]);
  expect(
    tripScreenAgentContext(
      { ...trip, permissions: { ...trip.permissions, canEdit: false } },
      'overview'
    ).capabilities
  ).toEqual(['trip.status.read', 'trip.itinerary.read', 'trip.packing.read', 'trip.traveler.set']);
  expect(
    tripScreenAgentContext(
      { ...trip, proposal: { status: 'draft' } } as unknown as TripDetail,
      'overview'
    ).capabilities
  ).toEqual([
    'trip.status.read',
    'trip.itinerary.read',
    'trip.packing.read',
    'trip.packing.manage'
  ]);
  expect(
    tripScreenAgentContext(
      {
        ...trip,
        archivedAt: Date.now(),
        permissions: { ...trip.permissions, canEdit: false }
      } as TripDetail,
      'overview'
    ).capabilities
  ).toEqual(['trip.status.read', 'trip.itinerary.read', 'trip.packing.read']);
  expect(tripScreenAgentContext(trip, 'issues').title).toContain('Issues');
  expect(tripScreenAgentContext(trip, 'ideas').title).toContain('Ideas');
  expect(
    tripScreenAgentContext(trip, 'ideas', {
      ideas: [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }]
    }).data
  ).toMatchObject({
    ideas: [{ id: 'proposal-lisbon', ideaName: 'Lisbon proposal', status: 'in_review' }]
  });
  expect(
    tripScreenAgentContext(trip, 'overview', {
      travelers: [{ name: 'Alex', status: 'going', userId: 'user-alex' }]
    }).data
  ).toMatchObject({
    travelers: [{ name: 'Alex', status: 'going', userId: 'user-alex' }]
  });
});

test('forwards live trip section changes through the shared agent context hook', () => {
  const view = render(
    <AgentContextProvider>
      <TripRegistration section="overview" />
      <Probe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Trip agent context' }).textContent).toContain(
    'user-alex'
  );

  view.rerender(
    <AgentContextProvider>
      <TripRegistration section="itinerary" />
      <Probe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Trip agent context' }).textContent).toContain(
    'trip.activity.add'
  );
  expect(screen.getByRole('status', { name: 'Trip agent context' }).textContent).not.toContain(
    'user-alex'
  );

  view.rerender(
    <AgentContextProvider>
      <TripRegistration section="ideas" />
      <Probe />
    </AgentContextProvider>
  );
  expect(screen.getByRole('status', { name: 'Trip agent context' }).textContent).toContain(
    'proposal-lisbon'
  );
  expect(screen.getByRole('status', { name: 'Trip agent context' }).textContent).not.toContain(
    'user-alex'
  );
});
