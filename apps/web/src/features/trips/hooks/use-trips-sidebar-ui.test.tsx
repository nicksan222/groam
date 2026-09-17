import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { TripListItem } from './use-trips';
import { useTripsSidebarUi } from './use-trips-sidebar-ui';

const trip = { id: 'trip-1' as Id<'trips'>, name: 'Portugal' } as TripListItem;

describe('useTripsSidebarUi', () => {
  test('tracks create, archive, and exclusive menu booleans', () => {
    const { result } = renderHook(() => useTripsSidebarUi());

    expect(result.current.isCreateOpen).toBe(false);
    expect(result.current.isArchiveOpen).toBe(false);
    expect(result.current.menuTripId).toBeNull();

    act(() => {
      result.current.openCreate();
      result.current.requestArchive(trip);
      result.current.onMenuOpenChange(trip.id, true);
    });
    expect(result.current.isCreateOpen).toBe(true);
    expect(result.current.isArchiveOpen).toBe(true);
    expect(result.current.tripToArchive).toEqual(trip);
    expect(result.current.menuTripId).toBe(trip.id);

    act(() => {
      result.current.onMenuOpenChange(trip.id, false);
      result.current.onArchiveOpenChange(false);
      result.current.closeCreate();
    });
    expect(result.current.menuTripId).toBeNull();
    expect(result.current.isArchiveOpen).toBe(false);
    expect(result.current.isCreateOpen).toBe(false);
  });

  test('sets create state from a controlled open-change callback', () => {
    const { result } = renderHook(() => useTripsSidebarUi());

    act(() => result.current.setCreateOpen(true));
    expect(result.current.isCreateOpen).toBe(true);
    act(() => result.current.setCreateOpen(false));
    expect(result.current.isCreateOpen).toBe(false);
    act(() => result.current.clearArchive());
    expect(result.current.tripToArchive).toBeNull();
  });
});
