import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { PersonalPackingList } from './personal-packing-list';

const personal = vi.hoisted(() => ({
  add: vi.fn(),
  isLoading: false,
  items: [] as unknown[],
  remove: vi.fn(),
  setPacked: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-personal-packing', () => ({
  useTripPersonalPacking: () => personal
}));

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => ({ isLoading: false, items: [] })
}));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'me' } } })
}));

const trip = (archivedAt: number | null = null) =>
  ({ archivedAt, id: 'trip-1' }) as unknown as TripDetail;

beforeEach(() => {
  vi.clearAllMocks();
  personal.items = [];
  personal.isLoading = false;
  personal.add.mockResolvedValue(true);
});

describe('PersonalPackingList', () => {
  test('is marked private and shows the empty state', async () => {
    await render(<PersonalPackingList trip={trip()} />);
    await expect.element(page.getByText('Only you can see this')).toBeVisible();
    await expect
      .element(
        page.getByText('Jot down what you want to remember, like a charger or your passport.')
      )
      .toBeVisible();
  });

  test('adds an item', async () => {
    await render(<PersonalPackingList trip={trip()} />);
    await page.getByLabelText('Item for my list').fill('Charger');
    await page.getByRole('button', { name: 'Add to my list' }).click();
    expect(personal.add).toHaveBeenCalledWith('Charger');
  });

  test('keeps Add pressable and focuses the field when it is empty', async () => {
    await render(<PersonalPackingList trip={trip()} />);
    await page.getByRole('button', { name: 'Add to my list' }).click();
    expect(personal.add).not.toHaveBeenCalled();
    await expect.element(page.getByLabelText('Item for my list')).toHaveFocus();
  });

  test('ticks and removes items', async () => {
    personal.items = [
      { id: 'a', label: 'Charger', packed: false },
      { id: 'b', label: 'Passport', packed: true }
    ];
    await render(<PersonalPackingList trip={trip()} />);
    await expect.element(page.getByText('1 of 2 packed', { exact: false })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Charger' }).click();
    expect(personal.setPacked).toHaveBeenCalledWith('a', true);
    await page.getByRole('checkbox', { name: 'Passport' }).click();
    expect(personal.setPacked).toHaveBeenCalledWith('b', false);
    await page.getByRole('button', { name: 'Remove Charger from my list' }).click();
    expect(personal.remove).toHaveBeenCalledWith({ id: 'a', label: 'Charger', packed: false });
  });

  test('is read-only on an archived trip', async () => {
    personal.items = [{ id: 'a', label: 'Charger', packed: false }];
    await render(<PersonalPackingList trip={trip(10)} />);
    await expect.element(page.getByText('Charger')).toBeVisible();
    await expect.element(page.getByRole('checkbox', { name: 'Charger' })).toBeDisabled();
    await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Remove Charger from my list' }))
      .not.toBeInTheDocument();
  });
});
