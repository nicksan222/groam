import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

test('marks sibling stop days as taken in the day strip', async () => {
  const destinations = [
    destination({ endDay: 2, id: id('lisbon'), name: 'Lisbon', position: 0, startDay: 1 }),
    destination({ endDay: 4, id: id('montreal'), name: 'Montreal', position: 1, startDay: 3 })
  ];

  await render(
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

  await expect
    .element(page.getByRole('button', { name: 'Day 1, Taken' }))
    .toHaveAttribute('data-taken');
  await expect.element(page.getByRole('button', { name: 'Day 2, Taken' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Day 3, Taken' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Day 4, Taken' })).not.toBeInTheDocument();
});

test('marks earlier stops fully taken when editing a later stop', async () => {
  const destinations = [
    destination({ endDay: 2, id: id('lisbon'), name: 'Lisbon', position: 0, startDay: 1 }),
    destination({ endDay: 4, id: id('montreal'), name: 'Montreal', position: 1, startDay: 3 }),
    destination({ endDay: 7, id: id('porto'), name: 'Porto', position: 2, startDay: 5 })
  ];

  await render(
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

  await expect
    .element(page.getByRole('button', { name: 'Day 1, Taken' }))
    .toHaveAttribute('data-taken');
  await expect
    .element(page.getByRole('button', { name: 'Day 2, Taken' }))
    .toHaveAttribute('data-taken');
  await expect
    .element(page.getByRole('button', { name: 'Day 3, Taken' }))
    .toHaveAttribute('data-taken');
  await expect.element(page.getByRole('button', { name: 'Day 4, Taken' })).not.toBeInTheDocument();
});
