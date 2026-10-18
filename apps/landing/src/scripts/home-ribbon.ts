/**
 * Pause control and off-screen pausing for the example trips ribbon.
 * The motion itself is pure CSS; this only toggles classes that pause it.
 */
export function initTripRibbon(ribbon: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const toggle = ribbon.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!toggle) return;

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const paused = ribbon.classList.toggle('paused');
    toggle.setAttribute('aria-pressed', String(paused));
  });

  let onScreen = true;
  const sync = () =>
    ribbon.classList.toggle('idle', !onScreen || document.visibilityState !== 'visible');
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    sync();
  }).observe(ribbon);
}
