import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

test('lists group members without an invite-to-trip action', async () => {
  await render(
    <TripTravelersSheet
      onOpenChange={vi.fn()}
      open
      tripId={'trip-1' as Id<'trips'>}
      tripName="Lisbon escape"
    />
  );

  await expect.element(page.getByTestId(testIds.tripTravelers)).toBeInTheDocument();
  await expect.element(page.getByText('Alex (you)')).toBeInTheDocument();
  await expect.element(page.getByText('Maya')).toBeInTheDocument();
  await expect
    .element(page.getByText(/everyone in this group is on lisbon escape/iu))
    .toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: /invite to this trip/iu }))
    .not.toBeInTheDocument();
});
