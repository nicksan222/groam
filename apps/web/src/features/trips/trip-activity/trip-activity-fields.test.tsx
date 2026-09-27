import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
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
