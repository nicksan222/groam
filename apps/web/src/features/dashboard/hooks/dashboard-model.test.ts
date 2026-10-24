import { describe, expect, test } from 'vite-plus/test';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { dashboardPresentation, greetingForHour } from './dashboard-model';

function trip(id: string, overrides: Partial<TripListItem> = {}): TripListItem {
  return { archivedAt: null, favorite: false, id, name: id, ...overrides } as TripListItem;
}

test.each([
  [2, 'Working late'],
  [9, 'Good morning'],
  [14, 'Good afternoon'],
  [20, 'Good evening']
])('greets hour %i with %s', (hour, greeting) => {
  expect(greetingForHour(hour)).toBe(greeting);
});

describe('dashboardPresentation', () => {
  test('is loading until the lists arrive, whatever they hold', () => {
    expect(
      dashboardPresentation({ activeTrips: [trip('a')], anyTrips: [], isLoading: true })
    ).toEqual({ kind: 'loading' });
  });

  test('is ready with active trips', () => {
    expect(
      dashboardPresentation({
        activeTrips: [trip('a')],
        anyTrips: [trip('a')],
        isLoading: false
      })
    ).toEqual({ kind: 'ready', trips: [trip('a')] });
  });

  test('asks for a first trip when there are none, and points to archived ones when only they exist', () => {
    expect(dashboardPresentation({ activeTrips: [], anyTrips: [], isLoading: false })).toEqual({
      kind: 'empty'
    });
    expect(
      dashboardPresentation({
        activeTrips: [],
        anyTrips: [trip('old', { archivedAt: 1 })],
        isLoading: false
      })
    ).toEqual({ kind: 'archived' });
  });
});
