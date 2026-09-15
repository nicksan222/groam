import { act, cleanup, renderHook } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useReferenceParams } from './use-reference-params';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('renders a route without references through the real subscription hook', async () => {
  const client = new ConvexReactClient('https://example.convex.cloud');
  try {
    const { result, rerender } = renderHook(() => useReferenceParams({ section: 'overview' }), {
      wrapper: ({ children }) => <ConvexProvider client={client}>{children}</ConvexProvider>
    });
    expect(result.current).toEqual({ ids: {}, shortIds: {}, loading: false, missing: false });
    rerender();
    expect(result.current.loading).toBe(false);
  } finally {
    cleanup();
    await client.close();
  }
});

test('receives reference updates and follows navigation without a render loop', async () => {
  const client = new ConvexReactClient('https://example.convex.cloud');
  const records = new Map<string, { id: string; shortId: string }>();
  const listeners = new Set<() => void>();
  vi.spyOn(client, 'watchQuery').mockImplementation((...watchArgs) => ({
    localQueryResult: () => records.get(String(watchArgs[1]?.reference)),
    localQueryLogs: () => undefined,
    journal: () => undefined,
    onUpdate: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    }
  }));
  try {
    const { result, rerender } = renderHook(({ tripId }) => useReferenceParams({ tripId }), {
      initialProps: { tripId: 'first-trip' },
      wrapper: ({ children }) => <ConvexProvider client={client}>{children}</ConvexProvider>
    });
    expect(result.current.loading).toBe(true);
    act(() => {
      records.set('first-trip', { id: 'first-trip', shortId: 'abc123' });
      listeners.forEach((notify) => {
        notify();
      });
    });
    expect(result.current.ids.tripId).toBe('first-trip');
    expect(result.current.shortIds.tripId).toBe('abc123');
    expect(result.current.loading).toBe(false);
    records.set('second-trip', { id: 'second-trip', shortId: 'def456' });
    rerender({ tripId: 'second-trip' });
    expect(result.current.ids.tripId).toBe('second-trip');
    expect(result.current.shortIds.tripId).toBe('def456');
  } finally {
    cleanup();
    await client.close();
  }
});
