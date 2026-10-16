import { DataTable } from '@groam/ui/components/data-table';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripActivityItem } from '@/features/trips/hooks/trip-activity-history-filter';
import { tripActivityColumns } from './trip-activity-history-columns';

function makeItem(overrides: Partial<TripActivityItem> = {}): TripActivityItem {
  return {
    actorName: 'Alex Traveler',
    actorUserId: 'user-alex',
    createdAt: Date.UTC(2026, 6, 12, 14, 30),
    id: 'activity-1',
    message: 'Alex Traveler created the trip',
    type: 'trip_created',
    ...overrides
  } as TripActivityItem;
}

function renderTable(data: TripActivityItem[]) {
  return render(
    <DataTable
      columns={tripActivityColumns()}
      data={data}
      empty="No activity"
      getRowId={(item) => item.id}
    />
  );
}

test('defines event, person, action and when columns', () => {
  expect(tripActivityColumns().map((column) => column.id)).toEqual([
    'message',
    'actor',
    'type',
    'createdAt'
  ]);
});

describe('rendered rows', () => {
  test('shows message, person, action label and time', async () => {
    await renderTable([makeItem()]);
    await expect.element(page.getByText('Alex Traveler created the trip')).toBeVisible();
    await expect
      .element(page.getByRole('cell', { name: 'Alex Traveler', exact: true }))
      .toBeVisible();
    await expect.element(page.getByText('Trip created')).toBeVisible();
    const time = page.getByRole('cell').last().element().querySelector('time');
    expect(time?.getAttribute('datetime')).toBe(
      new Date(Date.UTC(2026, 6, 12, 14, 30)).toISOString()
    );
  });

  test.each([
    ['sorting by event', 'Event'],
    ['sorting by when', 'When']
  ])('offers a header button for %s', async (_, name) => {
    await renderTable([makeItem()]);
    await expect.element(page.getByRole('button', { name })).toBeVisible();
  });

  test('sorts rows by event when the header is toggled', async () => {
    await renderTable([
      makeItem({ id: 'b' as never, message: 'Zed did a thing' }),
      makeItem({ id: 'a' as never, message: 'Abe did a thing' })
    ]);
    await page.getByRole('button', { name: 'Event' }).click();
    const rows = page.getByRole('row').elements();
    expect(rows[1]?.textContent).toContain('Abe');
    expect(rows[2]?.textContent).toContain('Zed');
  });

  test('shows the empty message without data', async () => {
    await renderTable([]);
    await expect.element(page.getByText('No activity')).toBeVisible();
  });
});
