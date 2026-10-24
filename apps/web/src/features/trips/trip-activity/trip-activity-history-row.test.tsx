import { List } from '@groam/ui/components/list';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { expect, test, vi } from 'vite-plus/test';
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

const viewer = vi.hoisted(() => ({ userId: 'user-other' as string | undefined }));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => (viewer.userId ? { session: { user: { id: viewer.userId } } } : null)
}));

test('shows the event and its time, with no jargon chip or repeated actor', async () => {
  viewer.userId = 'user-other';
  const item = makeItem();
  await render(
    <List.Group aria-label="Events">
      <TripActivityHistoryRow item={item} />
    </List.Group>
  );
  await expect.element(page.getByText(item.message)).toBeVisible();
  await expect.element(page.getByText('Alex Traveler', { exact: true })).not.toBeInTheDocument();
  await expect.element(page.getByText('Trip created')).not.toBeInTheDocument();
  expect(page.getByRole('listitem').element().querySelector('time')?.dateTime).toBe(
    new Date(item.createdAt).toISOString()
  );
});

test('says You for the viewer own actions', async () => {
  viewer.userId = 'user-alex';
  await render(
    <List.Group aria-label="Events">
      <TripActivityHistoryRow item={makeItem({ message: 'Alex Traveler started an idea' })} />
    </List.Group>
  );
  await expect.element(page.getByText('You started an idea')).toBeVisible();
});

test('every kind of event has its own icon', async () => {
  viewer.userId = undefined;
  await render(
    <List.Group aria-label="Events">
      <TripActivityHistoryRow item={makeItem({ id: 'a' as never, type: 'stay_added' })} />
      <TripActivityHistoryRow item={makeItem({ id: 'b' as never, type: 'destination_added' })} />
    </List.Group>
  );
  const icons = page
    .getByRole('listitem')
    .elements()
    .map((row) => row.querySelector('svg')?.innerHTML);
  expect(icons[0]).not.toBe(icons[1]);
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
  await page.getByLabelText('Sort events').click();
  await page.getByRole('radio', { name: 'Event A–Z' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Sort events' })).not.toBeInTheDocument();
  await expect.poll(() => page.getByRole('listitem').elements()[0]?.textContent).toContain('Abe');
  await page.getByLabelText('Sort events').click();
  await page.getByRole('radio', { name: 'Newest first' }).click();
  await expect.element(page.getByRole('dialog', { name: 'Sort events' })).not.toBeInTheDocument();
  await expect.poll(() => page.getByRole('listitem').elements()[0]?.textContent).toContain('Zed');
});

test('wraps long events to two lines on phones without horizontal scrolling', async () => {
  await useViewport(390, 844);
  // The list bleeds out of the page padding, so give it the padding it has in the app.
  await render(
    <div className="px-4">
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
    </div>
  );
  const rows = page.getByRole('listitem').elements();
  const height = (index: number) => Math.round(rows[index]?.getBoundingClientRect().height ?? 0);
  // The long row wraps (clamped to two lines) instead of truncating, so it is one line taller.
  expect(height(1)).toBeGreaterThan(height(0));
  expect(height(1) - height(0)).toBeLessThanOrEqual(24);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});
