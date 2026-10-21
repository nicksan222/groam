import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { useTripPayments } from './use-trip-payments';

const backend = vi.hoisted(() => ({
  checkout: vi.fn(),
  query: vi.fn()
}));

vi.mock('convex/react', () => ({
  useAction: () => backend.checkout,
  useQuery: (...args: unknown[]) => backend.query(...args)
}));

beforeEach(() => {
  vi.clearAllMocks();
  backend.query.mockReturnValue(undefined);
});

test('skips the query and checkout when the trip is unavailable', async () => {
  const { result } = await renderHook(() => useTripPayments(undefined));
  expect(backend.query).toHaveBeenCalledWith(expect.anything(), 'skip');
  await act(async () => {
    expect(await result.current.checkout('alex')).toEqual({ skipped: true, url: null });
  });
  expect(backend.checkout).not.toHaveBeenCalled();
  expect(result.current.enabled).toBe(false);
});

test('uses server payment status and forwards the selected traveler to checkout', async () => {
  backend.query.mockReturnValue({
    archived: true,
    enabled: true,
    travelers: [{ free: false, paid: true, userId: 'alex' }]
  });
  backend.checkout.mockResolvedValue({
    skipped: false,
    url: 'https://checkout.stripe.com/example'
  });
  const { result } = await renderHook(() => useTripPayments('trip-1' as Id<'trips'>));
  expect(result.current.travelers[0]?.paid).toBe(true);
  expect(result.current.enabled).toBe(true);
  expect(result.current.archived).toBe(true);
  expect(result.current.isLoading).toBe(false);
  await act(async () => {
    expect(await result.current.checkout('alex')).toEqual({
      skipped: false,
      url: 'https://checkout.stripe.com/example'
    });
  });
  expect(backend.checkout).toHaveBeenCalledWith({ tripId: 'trip-1', userId: 'alex' });
});
