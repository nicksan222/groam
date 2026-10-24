import { renderHook } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import {
  ReferenceContext,
  ReferenceStatusContext
} from '@/features/workspace/hooks/reference-context';
import { useCurrentTrip } from './use-current-trip';

const KEY = 'groam:current-trip:test';

const state = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  records: {} as Record<string, unknown>,
  resolved: undefined as unknown
}));

vi.mock('@/lib/navigation/router', () => ({ useParams: () => state.params }));
vi.mock('@/features/trips/hooks/use-remember-trip', () => ({
  useCurrentTripPreferenceKey: () => 'groam:current-trip:test'
}));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQuery: (_: unknown, args: unknown) => (args === 'skip' ? undefined : state.resolved)
}));
vi.mock('@/features/trips/hooks/use-trip-record', () => ({
  useTripRecord: (tripId: string | undefined) =>
    tripId === undefined ? undefined : state.records[tripId]
}));

const shared = (id: string, shortId = `s-${id}`) => ({
  canParticipate: true,
  id,
  name: id,
  proposal: null,
  shortId
});

function routeWrapper(ids: Record<string, string>, loading = false) {
  return ({ children }: { children?: ReactNode }) => (
    <ReferenceStatusContext value={{ loading, missing: false }}>
      <ReferenceContext value={ids}>{children}</ReferenceContext>
    </ReferenceStatusContext>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  state.params = {};
  state.records = {};
  state.resolved = undefined;
});

describe('useCurrentTrip', () => {
  test('the route trip wins over the remembered one', async () => {
    window.localStorage.setItem(KEY, 's-trip-old');
    state.params = { tripId: 'written-in-url' };
    state.records = { 'trip-old': shared('trip-old'), 'trip-route': shared('trip-route') };
    state.resolved = { id: 'trip-old', shortId: 's-trip-old' };
    const { result } = await renderHook(() => useCurrentTrip(), {
      wrapper: routeWrapper({ tripId: 'trip-route' })
    });
    expect(result.current.trip?.id).toBe('trip-route');
    expect(result.current.onTripRoute).toBe(true);
    expect(result.current.reference).toBe('written-in-url');
  });

  test('waits while the route reference is still resolving', async () => {
    state.params = { tripId: 'abc123' };
    window.localStorage.setItem(KEY, 's-trip-old');
    const { result } = await renderHook(() => useCurrentTrip(), {
      wrapper: routeWrapper({}, true)
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.trip).toBeNull();
  });

  test('uses the remembered short id off a trip route', async () => {
    window.localStorage.setItem(KEY, 's-trip-old');
    state.records = { 'trip-old': shared('trip-old') };
    state.resolved = { id: 'trip-old', shortId: 's-trip-old' };
    const { result } = await renderHook(() => useCurrentTrip());
    expect(result.current.trip?.id).toBe('trip-old');
    expect(result.current.onTripRoute).toBe(false);
    expect(result.current.reference).toBe('s-trip-old');
  });

  test('has no trip and is not loading when nothing is remembered', async () => {
    const { result } = await renderHook(() => useCurrentTrip());
    expect(result.current.trip).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('clears a remembered trip that no longer resolves, without throwing', async () => {
    window.localStorage.setItem(KEY, 'gone12');
    state.resolved = null;
    const { result } = await renderHook(() => useCurrentTrip());
    expect(result.current.trip).toBeNull();
    await expect.poll(() => window.localStorage.getItem(KEY)).toBeNull();
  });

  test('a working copy route stands for the shared trip it edits', async () => {
    state.params = { tripId: 'copy-ref' };
    state.records = {
      copy: { ...shared('copy'), proposal: { sourceTripId: 'source' } },
      source: shared('source', 'srcabc')
    };
    const { result } = await renderHook(() => useCurrentTrip(), {
      wrapper: routeWrapper({ tripId: 'copy' })
    });
    expect(result.current.trip?.id).toBe('source');
    expect(result.current.reference).toBe('srcabc');
  });
});
