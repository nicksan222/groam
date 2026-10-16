import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { Destination } from '@/types/trips';
import { EditorDayPlaces } from './editor-day-places';

function makeStop(id: string, name: string): Destination {
  return { activities: [], id, name, stays: [] } as unknown as Destination;
}

test('invites adding a destination when the day has none', async () => {
  await render(
    <EditorDayPlaces changes={[]} day={2} destinations={[]} onManageDestination={vi.fn()} />
  );
  await expect
    .element(page.getByText('Add a destination to start planning this day.'))
    .toBeVisible();
});

test('renders a manage button per place and reports the chosen id', async () => {
  const onManage = vi.fn();
  await render(
    <EditorDayPlaces
      changes={[]}
      day={2}
      destinations={[makeStop('lisbon', 'Lisbon'), makeStop('porto', 'Porto')]}
      onManageDestination={onManage}
    />
  );
  await expect.element(page.getByRole('button', { name: 'Manage Lisbon for Day 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Manage Porto for Day 2' }).click();
  expect(onManage).toHaveBeenCalledWith('porto');
});

test('highlights a place that the proposal changed', async () => {
  const change = {
    change: 'added',
    entity: 'destination',
    fields: [],
    key: 'destinations/lisbon.json',
    label: 'Lisbon'
  } as unknown as ItineraryChange;
  await render(
    <EditorDayPlaces
      changes={[change]}
      day={1}
      destinations={[makeStop('lisbon', 'Lisbon')]}
      onManageDestination={vi.fn()}
    />
  );
  await expect.element(page.getByText('New')).toBeInTheDocument();
});
