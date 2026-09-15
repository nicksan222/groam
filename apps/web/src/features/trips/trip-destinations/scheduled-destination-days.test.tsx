import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import type { Destination } from './destination-types';
import { ScheduledDestinationDays } from './scheduled-destination-days';

const id = (value: string) => value as Id<'tripDestinations'>;

function destination(
  overrides: Partial<Destination> & Pick<Destination, 'id' | 'name'>
): Destination {
  return {
    activities: [],
    coverStatus: null,
    coverUrl: null,
    dayNotes: null,
    endDay: null,
    latitude: 45.5,
    longitude: -73.5,
    placeId: `place-${overrides.name.toLowerCase()}`,
    position: 0,
    sourceId: null,
    startDay: null,
    stays: [],
    transferToNext: null,
    ...overrides
  };
}

afterEach(cleanup);

test('marks sibling stop days as taken in the day strip', () => {
  const destinations = [
    destination({ endDay: 2, id: id('lisbon'), name: 'Lisbon', position: 0, startDay: 1 }),
    destination({ endDay: 4, id: id('montreal'), name: 'Montreal', position: 1, startDay: 3 })
  ];

  render(
    <ScheduledDestinationDays
      canManage
      destination={destinations[1]!}
      destinations={destinations}
      endDay="4"
      isPending={false}
      maximumDay={8}
      minimumDay={2}
      setEndDay={() => {}}
      setStartDay={() => {}}
      startDate={null}
      startDay="3"
      tripDayCount={8}
    />
  );

  expect(screen.getByRole('button', { name: 'Day 1, Taken' }).hasAttribute('data-taken')).toBe(
    true
  );
  expect(screen.queryByRole('button', { name: 'Day 2, Taken' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Day 3, Taken' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Day 4, Taken' })).toBeNull();
});

test('marks earlier stops fully taken when editing a later stop', () => {
  const destinations = [
    destination({ endDay: 2, id: id('lisbon'), name: 'Lisbon', position: 0, startDay: 1 }),
    destination({ endDay: 4, id: id('montreal'), name: 'Montreal', position: 1, startDay: 3 }),
    destination({ endDay: 7, id: id('porto'), name: 'Porto', position: 2, startDay: 5 })
  ];

  render(
    <ScheduledDestinationDays
      canManage
      destination={destinations[2]!}
      destinations={destinations}
      endDay="7"
      isPending={false}
      maximumDay={8}
      minimumDay={4}
      setEndDay={() => {}}
      setStartDay={() => {}}
      startDate={null}
      startDay="5"
      tripDayCount={8}
    />
  );

  expect(screen.getByRole('button', { name: 'Day 1, Taken' }).hasAttribute('data-taken')).toBe(
    true
  );
  expect(screen.getByRole('button', { name: 'Day 2, Taken' }).hasAttribute('data-taken')).toBe(
    true
  );
  expect(screen.getByRole('button', { name: 'Day 3, Taken' }).hasAttribute('data-taken')).toBe(
    true
  );
  expect(screen.queryByRole('button', { name: 'Day 4, Taken' })).toBeNull();
});
