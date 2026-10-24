import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripPaymentsPanel } from './trip-payments-panel';

const payments = vi.hoisted(() => ({
  archived: false,
  checkout: vi.fn(),
  enabled: true,
  isLoading: false,
  travelers: [
    { free: true, paid: false, userId: 'creator' },
    { free: false, paid: false, userId: 'alex' },
    { free: false, paid: false, userId: 'maya' }
  ]
}));

vi.mock('@/features/trips/hooks/use-trip-payments', () => ({
  useTripPayments: () => payments
}));

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({
    travelers: [
      { name: 'Creator', userId: 'creator' },
      { name: 'Alex', userId: 'alex' },
      { name: 'Maya', userId: 'maya' }
    ]
  })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ session: { user: { id: 'alex' } } })
}));

beforeEach(() => {
  payments.archived = false;
  payments.enabled = true;
  payments.checkout = vi.fn().mockResolvedValue({ url: null });
  payments.travelers = [
    { free: true, paid: false, userId: 'creator' },
    { free: false, paid: false, userId: 'alex' },
    { free: false, paid: false, userId: 'maya' }
  ];
});

function renderPanel({ canManageOthers = false } = {}) {
  return render(
    <TripPaymentsPanel canManageOthers={canManageOthers} tripId={'trip-1' as Id<'trips'>} />
  );
}

test('hides all payment controls when payments are disabled', async () => {
  payments.enabled = false;
  await renderPanel();
  await expect.element(page.getByRole('region', { name: 'Trip payments' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});

test('explains the price and only lets members pay for themselves', async () => {
  await renderPanel();
  await expect.element(page.getByText(/€1 per traveler for this trip, paid once/u)).toBeVisible();
  await expect.element(page.getByText('Creator · free')).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
    .toBeEnabled();
  await expect
    .element(page.getByRole('button', { name: 'Cover €1 for Maya' }))
    .not.toBeInTheDocument();
  await expect.element(page.getByText('Awaiting payment')).toBeVisible();
});

test('lets organizers cover another current traveler', async () => {
  await renderPanel({ canManageOthers: true });
  await page.getByRole('button', { name: 'Cover €1 for Maya' }).click();
  expect(payments.checkout).toHaveBeenCalledWith('maya');
  await expect
    .element(page.getByRole('status'))
    .toHaveTextContent('No payment is needed. Your trip status will update automatically.');
});

test('prevents another checkout while the first one is opening', async () => {
  let finish!: (result: { url: null }) => void;
  payments.checkout.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  await renderPanel({ canManageOthers: true });
  await page.getByRole('button', { name: 'Cover €1 for Maya' }).click();
  await expect.element(page.getByRole('button', { name: 'Cover €1 for Maya' })).toBeDisabled();
  await expect
    .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
    .toBeDisabled();
  finish({ url: null });
  await expect.element(page.getByRole('button', { name: 'Cover €1 for Maya' })).toBeEnabled();
});

test('shows confirmed payment from the reactive server status', async () => {
  payments.travelers[1]!.paid = true;
  await renderPanel();
  await expect.element(page.getByText('Paid', { exact: true })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
    .not.toBeInTheDocument();
});

test('locks payments for archived trips', async () => {
  payments.archived = true;
  await renderPanel({ canManageOthers: true });
  await expect.element(page.getByRole('button', { name: 'Cover €1 for Maya' })).toBeDisabled();
  await expect
    .element(page.getByText(/Payments are locked while this trip is archived/u))
    .toBeVisible();
});

test('shows checkout errors and allows retrying', async () => {
  payments.checkout.mockRejectedValueOnce(new Error('Checkout is unavailable. Please try again.'));
  await renderPanel();
  await page.getByRole('button', { name: 'Pay €1 for your trip access' }).click();
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Checkout is unavailable. Please try again.');
  await expect
    .element(page.getByRole('button', { name: 'Pay €1 for your trip access' }))
    .toBeEnabled();
});

test.each([
  'javascript:alert(1)',
  'https://checkout.stripe.com.evil.example/pay',
  'https://user@checkout.stripe.com/pay'
])('rejects an untrusted checkout redirect: %s', async (url) => {
  payments.checkout.mockResolvedValue({ url });
  await renderPanel();
  await page.getByRole('button', { name: 'Pay €1 for your trip access' }).click();
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Checkout returned an untrusted address. Please try again.');
});

test('an organizer is told they can cover others; a member is told an organizer can cover them', async () => {
  await renderPanel({ canManageOthers: true });
  await expect.element(page.getByText(/you can also cover anyone else/iu)).toBeVisible();
});

test('a member is told an organizer can cover their seat', async () => {
  await renderPanel();
  await expect.element(page.getByText(/an organizer can cover your seat/iu)).toBeVisible();
});
