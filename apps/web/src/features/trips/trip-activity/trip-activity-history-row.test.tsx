import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripActivityItem } from '@/features/trips/hooks/trip-activity-history-filter';
import { TripActivityHistory } from './trip-activity-history';
import { TripActivityHistoryRow } from './trip-activity-history-row';

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

test('shows the event, actor, action and machine-readable time', async () => {
  const item = makeItem();
  await render(<TripActivityHistoryRow item={item} />);
  await expect.element(page.getByText(item.message)).toBeVisible();
  await expect.element(page.getByText('Alex Traveler', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Trip created')).toBeVisible();
  expect(page.getByRole('article').element().querySelector('time')?.dateTime).toBe(
    new Date(item.createdAt).toISOString()
  );
});

test('sorts events and restores source order', async () => {
  await render(
    <TripActivityHistory
      activity={[
        makeItem({ id: 'b' as never, message: 'Zed did a thing' }),
        makeItem({ id: 'a' as never, message: 'Abe did a thing' })
      ]}
    />
  );
  await page.getByLabelText('Sort activity').click();
  await page.getByRole('option', { name: 'Event A–Z' }).click();
  expect(page.getByRole('article').elements()[0]?.textContent).toContain('Abe');
  await page.getByLabelText('Sort activity').click();
  await page.getByRole('option', { name: 'Default order' }).click();
  expect(page.getByRole('article').elements()[0]?.textContent).toContain('Zed');
});

test('keeps long events in equal-height phone rows without horizontal scrolling', async () => {
  await useViewport(390, 844);
  await render(
    <TripActivityHistory
      activity={[
        makeItem(),
        makeItem({
          id: 'long' as never,
          message: 'A long event message '.repeat(20),
          actorName: 'A long actor name '.repeat(8)
        })
      ]}
    />
  );
  const rows = page.getByRole('article').elements();
  expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});
