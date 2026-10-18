/** Links a range input to a horizontally scrolling track so the whole trip can be scrubbed. */
export function scrubTimeline(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-track]');
  const range = root.querySelector<HTMLInputElement>('[data-range]');
  if (!track || !range) return;
  const span = () => Math.max(track.scrollWidth - track.clientWidth, 0);
  let syncing = false;
  range.addEventListener('input', () => {
    syncing = true;
    track.scrollLeft = (Number(range.value) / 100) * span();
    requestAnimationFrame(() => {
      syncing = false;
    });
  });
  track.addEventListener(
    'scroll',
    () => {
      if (!syncing && span() > 0)
        range.value = String(Math.round((track.scrollLeft / span()) * 100));
    },
    { passive: true }
  );
}
