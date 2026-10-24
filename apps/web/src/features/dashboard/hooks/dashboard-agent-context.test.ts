import { expect, test } from 'vite-plus/test';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import type { TripsTurn } from '@/types/dashboard';
import { buildDashboardContext } from './dashboard-agent-context';

const trips = [
  { id: 't1', name: 'Lisbon', nextAction: 'Continue planning together' }
] as TripListItem[];

test('describes the trips alone until what waits on the viewer is known', () => {
  const context = buildDashboardContext({ groupName: 'Acme', trips });
  expect(context).toMatchObject({ key: 'workspace:dashboard', title: 'Acme · Home' });
  expect(context.data).toEqual({
    groupName: 'Acme',
    trips: [{ id: 't1', name: 'Lisbon', nextAction: 'Continue planning together' }]
  });
});

test('adds the counts per trip and the viewer’s list once it loads', () => {
  const turn = {
    items: [{ id: 'i1', kind: 'issue', title: 'Book flights', tripName: 'Lisbon' }],
    total: 4,
    trips: [{ ideas: 1, issues: 2, polls: 1, tripId: 't1' }]
  } as unknown as TripsTurn;
  expect(buildDashboardContext({ groupName: 'Acme', trips, turn }).data).toEqual({
    groupName: 'Acme',
    trips: [
      {
        id: 't1',
        name: 'Lisbon',
        nextAction: 'Continue planning together',
        waitingOnYou: { ideas: 1, issues: 2, polls: 1 }
      }
    ],
    waitingOnYou: [{ id: 'i1', kind: 'issue', title: 'Book flights', trip: 'Lisbon' }],
    waitingOnYouTotal: 4
  });
});

test('leaves the list out when it could not be read', () => {
  expect(buildDashboardContext({ groupName: 'Acme', trips, turn: null }).data).not.toHaveProperty(
    'waitingOnYou'
  );
});
