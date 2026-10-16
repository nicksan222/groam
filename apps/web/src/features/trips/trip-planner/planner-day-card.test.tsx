import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { PlannerDay } from '@/types/trip-planner';
import { PlannerDayCard } from './planner-day-card';

function makeDestination(overrides: Record<string, unknown> = {}) {
  return {
    coverUrl: null,
    dayNotes: null,
    id: 'dest-1',
    name: 'Lisbon',
    startDay: 1,
    ...overrides
  };
}

function makeActivityEntry(title: string, startTime: string | null, overrides = {}) {
  return {
    activity: {
      address: null,
      attachments: [],
      costAmount: null,
      costSplit: 'total',
      id: title,
      notes: null
    },
    endDay: 1,
    endTime: null,
    key: `activity-${title}`,
    kind: 'activity',
    location: 'Lisbon',
    period: 'morning',
    startDay: 1,
    startTime,
    title,
    ...overrides
  };
}

function makeDay(overrides: Record<string, unknown> = {}): PlannerDay {
  return { day: 1, destinations: [], entries: [], stays: [], ...overrides } as PlannerDay;
}

describe('PlannerDayCard', () => {
  test('shows an empty open day', async () => {
    await render(<PlannerDayCard currency="USD" plan={makeDay()} startDate={null} />);
    await expect.element(page.getByRole('region', { name: 'Day 1' })).toBeVisible();
    await expect.element(page.getByText('Destination still open')).toBeVisible();
    await expect.element(page.getByText('Open time · nothing planned yet').first()).toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Flexible & all day, Day 1' }))
      .not.toBeInTheDocument();
  });

  test('labels the day with a date when the trip has a start date', async () => {
    await render(
      <PlannerDayCard currency="USD" plan={makeDay({ day: 2 })} startDate="2026-05-01" />
    );
    await expect.element(page.getByRole('region', { name: /^Day 2 .*Saturday/ })).toBeVisible();
  });

  test('groups entries by part of the day and fills the others with a hint', async () => {
    const plan = makeDay({
      destinations: [makeDestination()],
      entries: [
        makeActivityEntry('Museum', '10:00'),
        makeActivityEntry('Dinner', '19:00', { period: 'evening' })
      ]
    });
    await render(<PlannerDayCard currency="USD" plan={plan} startDate={null} />);
    await expect
      .element(page.getByRole('region', { name: 'Morning, Day 1' }).getByText('Museum'))
      .toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Evening, Day 1' }).getByText('Dinner'))
      .toBeVisible();
    await expect
      .element(
        page
          .getByRole('region', { name: 'Afternoon, Day 1' })
          .getByText('No separate plans for this part of the day')
      )
      .toBeVisible();
    await expect.element(page.getByText('Lisbon', { exact: true }).first()).toBeVisible();
  });

  test('shows a full-day section for flexible entries', async () => {
    const plan = makeDay({
      entries: [makeActivityEntry('Wander', null, { period: 'full_day' })]
    });
    await render(<PlannerDayCard currency="USD" plan={plan} startDate={null} />);
    await expect
      .element(page.getByRole('region', { name: 'Morning, Day 1' }).getByText('Wander'))
      .not.toBeInTheDocument();
  });

  test('joins distinct locations in the subtitle', async () => {
    const plan = makeDay({
      destinations: [makeDestination(), makeDestination({ id: 'd2', name: 'Porto' })]
    });
    await render(<PlannerDayCard currency="USD" plan={plan} startDate={null} />);
    await expect.element(page.getByText('Lisbon → Porto')).toBeVisible();
  });

  test('shows day notes only on the destination start day', async () => {
    const plan = makeDay({
      day: 2,
      destinations: [
        makeDestination({ dayNotes: 'Arrive early', startDay: 2 }),
        makeDestination({ dayNotes: 'Hidden note', id: 'd2', name: 'Porto', startDay: 1 })
      ]
    });
    await render(<PlannerDayCard currency="USD" plan={plan} startDate={null} />);
    await expect.element(page.getByText('Lisbon: Arrive early')).toBeVisible();
    await expect.element(page.getByText(/Hidden note/)).not.toBeInTheDocument();
  });

  test('lists stays for the day', async () => {
    const destination = makeDestination();
    const plan = makeDay({
      destinations: [destination],
      stays: [
        {
          destination,
          stay: {
            address: null,
            attachments: [],
            checkInDay: 1,
            checkInTime: null,
            checkOutDay: 2,
            checkOutTime: null,
            costAmount: null,
            id: 'stay-1',
            notes: null,
            title: 'Casa do Pátio'
          }
        }
      ]
    });
    await render(<PlannerDayCard currency="USD" plan={plan} startDate={null} />);
    await expect.element(page.getByText('Casa do Pátio')).toBeVisible();
    await expect.element(page.getByText('Staying overnight · Lisbon')).toBeVisible();
  });
});
