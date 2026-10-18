import { type CreateTripFormInput, fillCreateTripDialog } from '@groam/app-actions/vitest';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CreateTripDialog } from '@/features/trips/trip-create/create-trip-dialog';
import { testIds } from '@/lib/test-ids';

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: {
      members: [
        { user: { name: 'Alex' }, userId: 'user-alex' },
        { user: { name: 'Maya' }, userId: 'user-maya' },
        ...Array.from({ length: 28 }, (_, index) => ({
          user: { name: `Traveler ${index + 1}` },
          userId: `traveler-${index + 1}`
        }))
      ]
    },
    session: { user: { id: 'user-alex' } }
  })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-dialog-state', () => ({
  useWorkspaceDialogs: () => ({ openDialog: vi.fn() })
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

async function renderDialog() {
  const createTrip = vi.fn().mockResolvedValue('trip_123');
  const onCreated = vi.fn();
  await render(
    <CreateTripDialog createTrip={createTrip} onClose={vi.fn()} onCreated={onCreated} />
  );
  return { createTrip, onCreated };
}

const name = 'Coast weekend';

test('omits the cover image field from create trip', async () => {
  await renderDialog();

  await expect.element(page.getByLabelText(/cover image/iu)).not.toBeInTheDocument();
  await expect.element(page.getByText(/find a location photo/iu)).not.toBeInTheDocument();
  await expect.element(page.getByTestId('create-trip-cover')).not.toBeInTheDocument();
});

test('groups related fields under where, when, money, and people sections', async () => {
  await renderDialog();
  await page.getByText(/add dates and budget/iu).click();

  for (const heading of ['Where', 'When', 'Money', 'Who’s coming']) {
    await expect.element(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect.element(page.getByText('Alex (you)')).toBeVisible();
  await expect.element(page.getByText('Maya')).toBeVisible();
  await expect.element(page.getByRole('checkbox')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Invite to this group' })).toBeVisible();
  for (const label of [
    /trip name/iu,
    /start date/iu,
    /length \(days\)/iu,
    /if dates are still open/iu,
    /default currency/iu,
    /total group budget/iu
  ]) {
    await expect.element(page.getByLabelText(label)).toBeInTheDocument();
  }
});

test('keeps create disabled until a trip name is entered', async () => {
  await renderDialog();
  const submit = page.getByRole('button', { name: 'Create trip' });

  await expect.element(submit).toBeDisabled();
  await page.getByLabelText(/trip name/iu).fill('Summer beach trip');
  await expect.element(submit).toBeEnabled();
});

test.each<[string, CreateTripFormInput, Record<string, unknown>]>([
  ['only a name', { name }, {}],
  ['open dates', { dateNotes: 'Late July', name }, { dateNotes: 'Late July' }],
  [
    'a start date and length',
    { durationDays: 8, name, startDate: '2027-07-01' },
    { duration: { totalDays: 8 }, startDate: '2027-07-01' }
  ],
  ['a budget', { budget: 2500, name }, { budget: { amount: 2500 } }],
  [
    'every detail',
    { budget: 900, dateNotes: 'Flexible', durationDays: 3, name, startDate: '2027-05-10' },
    {
      budget: { amount: 900 },
      dateNotes: 'Flexible',
      duration: { totalDays: 3 },
      startDate: '2027-05-10'
    }
  ]
])('creates a trip with %s and no cover file', async (_, input, expected) => {
  const { createTrip, onCreated } = await renderDialog();
  await fillCreateTripDialog(input);

  await expect.poll(() => onCreated.mock.calls).toEqual([['trip_123']]);
  expect(createTrip).toHaveBeenCalledExactlyOnceWith(
    {
      clientRequestId: expect.any(String),
      currency: expect.any(String),
      destination: { status: 'undecided' },
      name,
      ...expected
    },
    null
  );
});

test.each<[string, CreateTripFormInput, string]>([
  ['a zero-day length', { durationDays: 0, name }, testIds.createTripDuration],
  ['a negative budget', { budget: -5, name }, testIds.createTripBudget]
])('rejects %s without creating a trip', async (_, input, field) => {
  const { createTrip } = await renderDialog();
  await fillCreateTripDialog(input);

  await expect.element(page.getByTestId(field)).toBeInvalid();
  expect(createTrip).not.toHaveBeenCalled();
});

test('shows every group member in a compact traveler list', async () => {
  await renderDialog();

  await expect.element(page.getByText('Traveler 1')).toBeVisible();
  await expect.element(page.getByText('Traveler 28')).toBeVisible();
  expect(page.getByTestId('create-trip-traveler').elements()).toHaveLength(30);
  await expect.element(page.getByText(/more$/u)).not.toBeInTheDocument();
  await expect
    .element(page.getByText('Shared with your group. Confirm travelers later.'))
    .toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'No length preset' }))
    .not.toBeInTheDocument();
});
