import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
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
  cleanup();
  packing.draft = '';
  packing.items = [];
  packing.isLoading = false;
  vi.clearAllMocks();
});

describe('TripPackingList', () => {
  test('shows an empty packing checklist', () => {
    render(<TripPackingList trip={{ id: 'idea-1', permissions: { canEdit: true } } as never} />);
    expect(screen.getByText('Build the packing list for this idea.')).toBeTruthy();
    expect(screen.getByTestId(testIds.tripPackingInput)).toBeTruthy();
  });

  test('toggles an existing item', () => {
    packing.items = [{ id: 'item-1', label: 'Passport', packed: false }];
    render(<TripPackingList trip={{ id: 'idea-1', permissions: { canEdit: true } } as never} />);
    fireEvent.click(screen.getByTestId(testIds.tripPackingToggle));
    expect(packing.toggle).toHaveBeenCalledWith('item-1', true);
  });
});

test('shared and non-editable idea checklists have no write controls', () => {
  packing.items = [
    { id: 'item-1', label: 'Passport', packed: true },
    { id: 'item-2', label: 'Hat', packed: false }
  ];
  render(<TripPackingList trip={{ id: 'shared-1', permissions: { canEdit: false } } as never} />);
  expect(screen.getByText('Passport')).toBeTruthy();
  expect(screen.getByText('1 of 2 packed')).toBeTruthy();
  expect(screen.getByLabelText('Packed')).toBeTruthy();
  expect(screen.getByLabelText('Not packed')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
});

test('shows a calm read-only packing empty state', () => {
  render(<TripPackingList trip={{ id: 'shared-1', permissions: { canEdit: false } } as never} />);
  expect(screen.getByText('No packing items in this plan yet.')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
});
