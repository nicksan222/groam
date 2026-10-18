/**
 * Endless lane of example trips. The CSS marquee runs by itself; this wires the pause
 * control and stops the lane while off screen or while the tab is hidden.
 */
export function playPricingLane(lane: HTMLElement): void {
  const viewport = lane.querySelector<HTMLElement>('.viewport');
  const toggle = lane.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!viewport || !toggle) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let paused = false;
  let onScreen = false;

  const sync = () => {
    const state = paused
      ? 'paused'
      : !onScreen || document.visibilityState !== 'visible'
        ? 'offscreen'
        : 'running';
    viewport.dataset.state = state;
  };

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    sync();
  }).observe(lane);
}
