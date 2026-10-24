import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  emptyActivityForm,
  type TripDestinationWithActivities
} from '@/features/trips/hooks/trip-activity-form-state';
import type { TripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import { TripActivityFields } from './trip-activity-fields';

test('explains an invalid cost instead of silently disabling the activity submit button', async () => {
  const editor = {
    ...emptyActivityForm({
      startDay: 1,
      activities: []
    } as unknown as TripDestinationWithActivities),
    cost: '-3',
    currency: 'EUR',
    dayOptions: [1],
    destinationId: 'destination-1' as Id<'tripDestinations'>,
    patch: vi.fn(),
    tripStartDate: null
  } as unknown as TripActivityEditor;
  await render(<TripActivityFields editor={editor} />);
  await expect.element(page.getByText('Cost must be zero or more.')).toBeInTheDocument();
});

test('keeps optional activity details collapsed for a quick inline add', async () => {
  const editor = {
    ...emptyActivityForm({
      startDay: 2,
      activities: []
    } as unknown as TripDestinationWithActivities),
    currency: 'EUR',
    dayOptions: [2, 3],
    destinationId: 'destination-1' as Id<'tripDestinations'>,
    patch: vi.fn(),
    tripStartDate: null
  } as unknown as TripActivityEditor;
  await render(<TripActivityFields compact editor={editor} />);

  await expect.element(page.getByTestId('activity-title')).toBeInTheDocument();
  const disclosure = page
    .getByText(/More options: dates/u)
    .element()
    .closest('[data-slot="collapsible"]');
  expect(disclosure?.getAttribute('data-state')).toBe('closed');
  await page.getByText(/More options: dates/u).click();
  expect(disclosure?.getAttribute('data-state')).toBe('open');
  await expect.element(page.getByText('Estimated cost for the group (EUR)')).toBeInTheDocument();
});
