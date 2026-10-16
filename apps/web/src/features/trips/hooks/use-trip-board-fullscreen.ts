import { useCallback, useEffect, useState } from 'react';

/**
 * Browser fullscreen for the whole page, so portaled popovers and dialogs stay visible; the board
 * covers the app itself while it is on. `supported` is false where the Fullscreen API is off, and
 * a refused request leaves things as they were.
 */
export function useTripBoardFullscreen() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(document.fullscreenElement === document.documentElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // The browser refused, for example without a user gesture: stay as we are.
    }
  }, []);

  return { active, supported: document.fullscreenEnabled, toggle };
}
