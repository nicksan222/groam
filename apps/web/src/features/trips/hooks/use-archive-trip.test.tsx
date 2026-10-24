import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { useArchiveTrip } from './use-archive-trip';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => confirm
}));

const tripState = { archive: vi.fn(), restore: vi.fn() } as unknown as TripState;

beforeEach(() => {
  vi.clearAllMocks();
});

test('archives only after the viewer confirms', async () => {
  const { result } = await renderHook(() => useArchiveTrip(tripState));

  confirm.mockResolvedValueOnce(false);
  await act(() => result.current.archive());
  expect(tripState.archive).not.toHaveBeenCalled();

  confirm.mockResolvedValueOnce(true);
  await act(() => result.current.archive());
  expect(confirm).toHaveBeenCalledWith(
    'Archive this trip?',
    'It will become read-only until restored.'
  );
  expect(tripState.archive).toHaveBeenCalledTimes(1);
});

test('restores without confirming', async () => {
  const { result } = await renderHook(() => useArchiveTrip(tripState));
  await act(() => result.current.restore());
  expect(confirm).not.toHaveBeenCalled();
  expect(tripState.restore).toHaveBeenCalledTimes(1);
});
