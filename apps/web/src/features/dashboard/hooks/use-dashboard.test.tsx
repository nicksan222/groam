import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { useDashboard } from './use-dashboard';

const state = vi.hoisted(() => ({
  all: { isLoading: false, trips: [] as unknown[] },
  active: { isLoading: false, trips: [] as unknown[] },
  turn: vi.fn(),
  useTrips: vi.fn()
}));

vi.mock('./use-trips-turn', () => ({
  useTripsTurn: (enabled: boolean) => state.turn(enabled)
}));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { id: 'org-1', name: 'Acme' } })
}));
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (options?: unknown) => {
    state.useTrips(options);
    if (options === 'skip') return { isLoading: false, trips: [] };
    return options ? state.active : state.all;
  }
}));

const trip = (id: string, overrides: Partial<TripListItem> = {}) =>
  ({ archivedAt: null, favorite: false, id, name: id, ...overrides }) as TripListItem;

beforeEach(() => {
  vi.clearAllMocks();
  state.active = { isLoading: false, trips: [] };
  state.all = { isLoading: false, trips: [] };
});

test('is loading while the active trips load, and asks nothing more', async () => {
  state.active = { isLoading: true, trips: [] };
  const { result } = await renderHook(() => useDashboard());
  expect(result.current.presentation).toEqual({ kind: 'loading' });
  expect(state.useTrips).toHaveBeenLastCalledWith('skip');
});

test('is ready with the active trips as listed, and only then asks what waits on the viewer', async () => {
  state.active = {
    isLoading: false,
    trips: [trip('b', { favorite: true }), trip('a')]
  };
  const { result } = await renderHook(() => useDashboard());
  expect(result.current.presentation).toMatchObject({ kind: 'ready' });
  expect(
    result.current.presentation.kind === 'ready' &&
      result.current.presentation.trips.map((item) => item.id)
  ).toEqual(['b', 'a']);
  expect(state.useTrips).toHaveBeenLastCalledWith('skip');
  expect(state.turn).toHaveBeenLastCalledWith(true);
});

test('without active trips it checks all of them: none asks for a first trip', async () => {
  const { result } = await renderHook(() => useDashboard());
  expect(result.current.presentation).toEqual({ kind: 'empty' });
  expect(state.useTrips).toHaveBeenLastCalledWith(undefined);
  expect(state.turn).toHaveBeenLastCalledWith(false);
});

test('without active trips, archived ones are pointed to', async () => {
  state.all = { isLoading: false, trips: [trip('old', { archivedAt: 1 })] };
  const { result } = await renderHook(() => useDashboard());
  expect(result.current.presentation).toEqual({ kind: 'archived' });
});

test('stays loading while the check of all trips loads', async () => {
  state.all = { isLoading: true, trips: [] };
  const { result } = await renderHook(() => useDashboard());
  expect(result.current.presentation).toEqual({ kind: 'loading' });
});
