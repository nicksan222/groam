import type { Id } from '@groam/backend/data-model';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import {
  emptyActivityForm,
  type TripDestinationWithActivities
} from '@/features/trips/hooks/trip-activity-form-state';
import type { TripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import { TripActivityFields } from './trip-activity-fields';

afterEach(cleanup);

test('explains an invalid cost instead of silently disabling the activity submit button', () => {
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
  render(<TripActivityFields editor={editor} idPrefix="activity" />);
  expect(screen.getByText('Cost must be zero or more.')).toBeDefined();
});

test('keeps optional activity details collapsed for a quick inline add', () => {
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
  render(<TripActivityFields compact editor={editor} idPrefix="activity" />);

  expect(screen.getByTestId('activity-title')).toBeDefined();
  const disclosure = screen.getByText(/More options: dates/u).closest('details');
  expect(disclosure?.open).toBe(false);
  fireEvent.click(screen.getByText(/More options: dates/u));
  expect(disclosure?.open).toBe(true);
  expect(screen.getByText('Estimated cost for the group (EUR)')).toBeDefined();
});
