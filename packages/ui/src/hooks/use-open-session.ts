import { useState } from 'react';

/**
 * Counts how many times `open` has turned true. Key a dialog's form on it so every opening starts
 * from a fresh draft, while closing keeps the same key and the exit animation still plays.
 */
export function useOpenSession(open: boolean): number {
  const [session, setSession] = useState({ count: 0, open });
  // Adjusting state during render is React's documented way to respond to a prop change.
  if (session.open !== open) {
    const next = { count: open ? session.count + 1 : session.count, open };
    setSession(next);
    return next.count;
  }
  return session.count;
}
