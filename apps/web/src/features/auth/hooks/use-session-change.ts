import { useConvexAuth } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
// oxlint-disable-next-line react-doctor/no-flush-sync -- The hidden workspace must commit, dropping its subscriptions, before the auth request starts; it runs outside page navigations, which own the View Transitions.
import { flushSync } from 'react-dom';
import type { ChangeSession } from '@/types/account-security';

/**
 * Pauses the workspace around auth requests that end or replace the session. The server drops the
 * old session before the client hears of it, so mounted workspace subscriptions would rerun
 * against a session that is gone and throw "Not authenticated".
 */
export function useSessionChange() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isChangingSession, setChangingSession] = useState(false);
  const focusedBefore = useRef<Element | null>(null);
  // Convex has taken over: it is fetching a token for the new session, or there is none.
  if (isChangingSession && (isLoading || !isAuthenticated)) setChangingSession(false);

  // A failed request keeps the session, so the workspace comes back as it was: give focus back.
  // After a success Convex remounts the workspace and the old element is gone.
  useEffect(() => {
    if (isChangingSession) return;
    const element = focusedBefore.current;
    focusedBefore.current = null;
    if (element instanceof HTMLElement && element.isConnected) element.focus();
  }, [isChangingSession]);

  const changeSession = useCallback<ChangeSession>(async (request) => {
    focusedBefore.current = document.activeElement;
    // Commit the hidden workspace first so its subscriptions are gone before the request starts.
    flushSync(() => setChangingSession(true));
    try {
      const result = await request();
      if (result.error) setChangingSession(false);
      return result;
    } catch (error: unknown) {
      setChangingSession(false);
      throw error;
    }
  }, []);

  return { changeSession, isChangingSession };
}
