import { act, renderHook } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { useTripListControls } from './use-trip-list-controls';

test('routes repeated shell requests to independent filter and sort dialogs', async () => {
  useTripCreateRequestStore.getState().clear();
  const { result } = await renderHook(() => useTripListControls());
  await act(() => useTripCreateRequestStore.getState().request('sort'));
  expect(result.current.sorting.open).toBe(true);
  expect(result.current.searching.open).toBe(false);
  await act(() => result.current.sorting.closePanel());
  await act(() => useTripCreateRequestStore.getState().request('search'));
  expect(result.current.searching.open).toBe(true);
  expect(result.current.sorting.open).toBe(false);
  await act(() => result.current.searching.closePanel());
  await act(() => useTripCreateRequestStore.getState().request('sort'));
  expect(result.current.sorting.open).toBe(true);
  expect(useTripCreateRequestStore.getState().requested).toBeNull();
});
