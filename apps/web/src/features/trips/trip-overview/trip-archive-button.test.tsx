import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { TripArchiveButton } from './trip-archive-button';

const hook = vi.hoisted(() => ({
  archive: vi.fn(),
  isPending: false,
  restore: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-archive-trip', () => ({
  useArchiveTrip: () => hook
}));

function makeTrip(
  archivedAt: number | null,
  permissions: { canArchive?: boolean; canRestore?: boolean }
) {
  return { archivedAt, permissions } as unknown as TripDetail;
}

const tripState = {} as TripState;

beforeEach(() => {
  hook.isPending = false;
  vi.clearAllMocks();
});

describe('TripArchiveButton', () => {
  test('archives an active trip', async () => {
    await render(
      <TripArchiveButton trip={makeTrip(null, { canArchive: true })} tripState={tripState} />
    );
    await page.getByRole('button', { name: 'Archive trip' }).click();
    expect(hook.archive).toHaveBeenCalledTimes(1);
  });

  test('renders nothing when the viewer cannot archive', async () => {
    await render(
      <TripArchiveButton trip={makeTrip(null, { canArchive: false })} tripState={tripState} />
    );
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });

  test('disables archive while pending', async () => {
    hook.isPending = true;
    await render(
      <TripArchiveButton trip={makeTrip(null, { canArchive: true })} tripState={tripState} />
    );
    await expect.element(page.getByRole('button', { name: /Archive trip/ })).toBeDisabled();
  });

  test('restores an archived trip', async () => {
    await render(
      <TripArchiveButton trip={makeTrip(1, { canRestore: true })} tripState={tripState} />
    );
    await expect.element(page.getByText('This trip is archived and read-only.')).toBeVisible();
    await page.getByRole('button', { name: 'Restore trip' }).click();
    expect(hook.restore).toHaveBeenCalledTimes(1);
  });

  test('hides restore without permission', async () => {
    await render(
      <TripArchiveButton trip={makeTrip(1, { canRestore: false })} tripState={tripState} />
    );
    await expect.element(page.getByText('This trip is archived and read-only.')).toBeVisible();
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });

  test('disables restore while pending', async () => {
    hook.isPending = true;
    await render(
      <TripArchiveButton trip={makeTrip(1, { canRestore: true })} tripState={tripState} />
    );
    await expect.element(page.getByRole('button', { name: /Restore trip/ })).toBeDisabled();
  });
});
