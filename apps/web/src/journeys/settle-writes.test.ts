import type { ConnectionState } from 'convex/browser';
import { describe, expect, test, vi } from 'vite-plus/test';
import { settleWrites } from '@/journeys/settle-writes';

/** A client whose in-flight mutation count the test sets by hand. */
function fakeClient(inflightMutations: number) {
  const state: ConnectionState = {
    connectionCount: 1,
    connectionRetries: 0,
    hasEverConnected: true,
    hasInflightRequests: inflightMutations > 0,
    inflightActions: 0,
    inflightMutations,
    isWebSocketConnected: true,
    timeOfOldestInflightRequest: null
  };
  const listeners = new Set<(next: ConnectionState) => void>();
  const client: Parameters<typeof settleWrites>[0] = {
    connectionState: () => ({ ...state }),
    subscribeToConnectionState: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
  const settle = (count: number) => {
    state.inflightMutations = count;
    for (const listener of listeners) listener({ ...state });
  };
  return { client, listeners, settle };
}

describe('settleWrites', () => {
  test('resolves at once when nothing is in flight', async () => {
    const { client, listeners } = fakeClient(0);
    await settleWrites(client);
    expect(listeners.size).toBe(0);
  });

  test('waits for the in-flight mutation before a reload closes the client', async () => {
    const { client, listeners, settle } = fakeClient(1);
    let settled = false;
    const done = settleWrites(client).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    settle(0);
    await done;
    expect(settled).toBe(true);
    expect(listeners.size).toBe(0);
  });

  test('gives up after the timeout so a stuck write never hangs the journey', async () => {
    vi.useFakeTimers();
    try {
      const { client, listeners } = fakeClient(1);
      const done = settleWrites(client, 500);
      await vi.advanceTimersByTimeAsync(500);
      await done;
      expect(listeners.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
