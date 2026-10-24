/**
 * One polite status region for the whole document, shared by every pending `Button`. A region per
 * button would put an extra sibling next to each one (breaking `:last-child`, `space-x-*`, and
 * `divide-*` in parents) and read out once per button. The region is created on first use and
 * lives on `document.body`, outside any React tree, so nothing has to be mounted for it.
 */

/** A busy button must stay busy this long before it is announced, so quick saves stay silent. */
const ANNOUNCE_DELAY_MS = 250;
const BUSY_MESSAGE = 'Working…';

let region: HTMLElement | null = null;
let busyCount = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function statusRegion(): HTMLElement {
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('role', 'status');
  region.dataset.slot = 'busy-announcer';
  // The `sr-only` recipe inline, so it holds even where Tailwind never scanned this file.
  Object.assign(region.style, {
    border: '0',
    clip: 'rect(0, 0, 0, 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: '0',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px'
  });
  document.body.append(region);
  return region;
}

/**
 * Marks one more action as in flight and returns the function that ends it. The status reads
 * "Working…" while any is in flight (after a short delay) and is cleared when the last ends.
 */
export function announceBusy(): () => void {
  busyCount += 1;
  if (busyCount === 1) {
    timer = setTimeout(() => {
      statusRegion().textContent = BUSY_MESSAGE;
    }, ANNOUNCE_DELAY_MS);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    busyCount -= 1;
    if (busyCount > 0) return;
    clearTimeout(timer);
    if (region) region.textContent = '';
  };
}
