const RELOAD_MARKER = 'groam:stale-chunk-reload';
const RELOAD_COOLDOWN_MS = 60_000;

/**
 * A release replaces the hashed route chunks, so a tab opened before it 404s on its next lazy
 * import. Vite reports that as `vite:preloadError`; reload once to pick up the new build. A
 * recent marker means the reload already happened and the failure is something else, so the
 * error is left to surface instead of looping.
 */
export function reloadOnStaleChunk(
  event: Event,
  { storage = sessionStorage, reload = () => window.location.reload(), now = Date.now } = {}
): boolean {
  const last = Number(storage.getItem(RELOAD_MARKER));
  if (last && now() - last < RELOAD_COOLDOWN_MS) return false;
  storage.setItem(RELOAD_MARKER, String(now()));
  event.preventDefault();
  reload();
  return true;
}

export function installStaleChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    reloadOnStaleChunk(event);
  });
}
