import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripPackingPanel } from './trip-packing-panel';

vi.mock('./group-gear-section', () => ({ GroupGearSection: () => <p>group gear section</p> }));
vi.mock('./personal-packing-list', () => ({
  PersonalPackingList: () => <p>personal list section</p>
}));

test('composes the header, group gear, and the private list', async () => {
  await render(<TripPackingPanel trip={{ id: 'trip-1' } as unknown as TripDetail} />);
  await expect.element(page.getByTestId(testIds.tripPackingPanel)).toBeVisible();
  await expect.element(page.getByRole('heading', { name: 'Packing' })).toBeVisible();
  await expect.element(page.getByText('group gear section')).toBeVisible();
  await expect.element(page.getByText('personal list section')).toBeVisible();
});
