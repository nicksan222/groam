import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripTravelersSheet } from '@/features/trips/trip-travelers/trip-travelers-sheet';
import { testIds } from '@/lib/test-ids';

vi.mock('@/features/trips/trip-travelers/trip-payments-panel', () => ({
  TripPaymentsPanel: () => null
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

const roster = vi.hoisted(() => ({
  isLoading: false,
  setStatus: vi.fn(),
  travelers: [] as Array<Record<string, unknown>>
}));

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: (tripId: string | undefined) => ({
    isLoading: tripId ? roster.isLoading : true,
    setStatus: roster.setStatus,
    travelers: tripId ? roster.travelers : []
  })
}));

beforeEach(() => {
  roster.isLoading = false;
  roster.setStatus = vi.fn().mockResolvedValue(true);
  roster.travelers = [
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
  ];
});

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

function renderSheet(props: { archived?: boolean; canManageOthers?: boolean }) {
  return render(
    <TripTravelersSheet
      {...props}
      onOpenChange={vi.fn()}
      open
      tripId={'trip-1' as Id<'trips'>}
      tripName="Lisbon escape"
    />
  );
}

test('lets a plain member change only their own RSVP', async () => {
  await renderSheet({});
  const selects = page.getByRole('combobox');
  await expect.element(selects.nth(0)).toBeEnabled();
  await expect.element(selects.nth(1)).toBeDisabled();
});

test('labels travelers who have not joined yet as invited', async () => {
  roster.travelers[1]!.status = 'invited';
  await renderSheet({});
  await expect
    .element(page.getByRole('combobox', { name: 'RSVP for Maya' }))
    .toHaveTextContent('Invited');
});

test('lets an organizer change every RSVP', async () => {
  await renderSheet({ canManageOthers: true });
  const selects = page.getByRole('combobox');
  await expect.element(selects.nth(0)).toBeEnabled();
  await expect.element(selects.nth(1)).toBeEnabled();
});

test('locks every RSVP on an archived trip', async () => {
  await renderSheet({ archived: true, canManageOthers: true });
  const selects = page.getByRole('combobox');
  await expect.element(selects.nth(0)).toBeDisabled();
  await expect.element(selects.nth(1)).toBeDisabled();
});

test('names each RSVP control for screen readers', async () => {
  await renderSheet({ canManageOthers: true });
  await expect.element(page.getByRole('combobox', { name: 'Your RSVP' })).toBeEnabled();
  await expect.element(page.getByRole('combobox', { name: 'RSVP for Maya' })).toBeEnabled();
});

test('updates another traveler when an organizer picks a status', async () => {
  await renderSheet({ canManageOthers: true });
  await page.getByRole('combobox', { name: 'RSVP for Maya' }).click();
  await page.getByRole('option', { name: 'Maybe' }).click();
  expect(roster.setStatus).toHaveBeenCalledWith('maybe', 'user-maya');
});

test('explains that RSVPs are locked on an archived trip', async () => {
  await renderSheet({ archived: true });
  await expect
    .element(page.getByText(/RSVPs are locked while the trip is archived/u))
    .toBeVisible();
  await expect.element(page.getByText(/Update RSVPs here/u)).not.toBeInTheDocument();
});

test('shows a loading state while the roster loads', async () => {
  roster.isLoading = true;
  roster.travelers = [];
  await renderSheet({});
  await expect.element(page.getByRole('status', { name: 'Loading travelers…' })).toBeVisible();
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
});

test('shows an empty state when nobody is on the roster', async () => {
  roster.travelers = [];
  await renderSheet({});
  await expect.element(page.getByText('No travelers yet')).toBeVisible();
});

test('renders nothing while closed', async () => {
  await render(
    <TripTravelersSheet
      onOpenChange={vi.fn()}
      open={false}
      tripId={'trip-1' as Id<'trips'>}
      tripName="Lisbon escape"
    />
  );
  await expect.element(page.getByTestId(testIds.tripTravelers)).not.toBeInTheDocument();
});
