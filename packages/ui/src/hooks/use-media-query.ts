import { useSyncExternalStore } from 'react';

/** Whether a CSS media query matches now, and again whenever it changes. False on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
