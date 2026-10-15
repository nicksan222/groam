import { render } from '@groam/vitest-config/react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { TripPackingList } from './trip-packing-list';

const packing = vi.hoisted(() => ({
  add: vi.fn(),
  draft: '',
  isLoading: false,
  isPending: false,
  items: [] as { id: string; label: string; packed: boolean }[],
  remove: vi.fn(),
  setDraft: vi.fn(),
  toggle: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => packing
}));

afterEach(() => {
  packing.draft = '';
  packing.items = [];
  packing.isLoading = false;
  vi.clearAllMocks();
});

describe('TripPackingList', () => {
  test('shows an empty packing checklist', async () => {
    await render(
      <TripPackingList trip={{ id: 'idea-1', permissions: { canEdit: true } } as never} />
    );
    await expect
      .element(page.getByText('Build the packing list for this idea.'))
      .toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.tripPackingInput)).toBeInTheDocument();
  });

  test('toggles an existing item', async () => {
    packing.items = [{ id: 'item-1', label: 'Passport', packed: false }];
    await render(
      <TripPackingList trip={{ id: 'idea-1', permissions: { canEdit: true } } as never} />
    );
    await page.getByTestId(testIds.tripPackingToggle).click();
    expect(packing.toggle).toHaveBeenCalledWith('item-1', true);
  });
});

test('shared and non-editable idea checklists have no write controls', async () => {
  packing.items = [
    { id: 'item-1', label: 'Passport', packed: true },
    { id: 'item-2', label: 'Hat', packed: false }
  ];
  await render(
    <TripPackingList trip={{ id: 'shared-1', permissions: { canEdit: false } } as never} />
  );
  await expect.element(page.getByText('Passport')).toBeInTheDocument();
  await expect.element(page.getByText('1 of 2 packed')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Packed')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Not packed')).toBeInTheDocument();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
});

test('shows a calm read-only packing empty state', async () => {
  await render(
    <TripPackingList trip={{ id: 'shared-1', permissions: { canEdit: false } } as never} />
  );
  await expect.element(page.getByText('No packing items in this plan yet.')).toBeInTheDocument();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
});
