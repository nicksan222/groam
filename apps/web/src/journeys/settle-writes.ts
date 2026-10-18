import type { ConvexReactClient } from 'convex/react';

/**
 * Waits until the client has no mutation in flight, or `timeoutMs` passes. A journey remounts
 * the app to reload a page, and closing the client drops any mutation it has not finished; an
 * optimistic update already shows the change, so without this a reload right after a drop can
 * lose the very write it means to check.
 */
export function settleWrites(
  client: Pick<ConvexReactClient, 'connectionState' | 'subscribeToConnectionState'>,
  timeoutMs = 10_000
): Promise<void> {
  if (client.connectionState().inflightMutations === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let unsubscribe = (): void => undefined;
    const finish = (): void => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    unsubscribe = client.subscribeToConnectionState((state) => {
      if (state.inflightMutations === 0) finish();
    });
    // The last mutation may have settled between the first check and subscribing.
    if (client.connectionState().inflightMutations === 0) finish();
  });
}
