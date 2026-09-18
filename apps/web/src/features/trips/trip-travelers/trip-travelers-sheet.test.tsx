import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { TripTravelersSheet } from '@/features/trips/trip-travelers/trip-travelers-sheet';
import { testIds } from '@/lib/test-ids';

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({
    setStatus: vi.fn(),
    travelers: [
      {
        handle: '@alex',
        id: 'user-alex',
        image: null,
        invitationId: null,
        name: 'Alex',
        status: 'going',
        userId: 'user-alex'
      },
      {
        handle: '@maya',
        id: 'user-maya',
        image: null,
        invitationId: null,
        name: 'Maya',
        status: 'going',
        userId: 'user-maya'
      }
    ]
  })
}));

afterEach(cleanup);

test('lists group members without an invite-to-trip action', () => {
  render(
    <TripTravelersSheet
      onOpenChange={vi.fn()}
      open
      tripId={'trip-1' as Id<'trips'>}
      tripName="Lisbon escape"
    />
  );

  expect(screen.getByTestId(testIds.tripTravelers)).toBeTruthy();
  expect(screen.getByText('Alex (you)')).toBeTruthy();
  expect(screen.getByText('Maya')).toBeTruthy();
  expect(screen.getByText(/everyone in this group is on lisbon escape/iu)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /invite to this trip/iu })).toBeNull();
});
