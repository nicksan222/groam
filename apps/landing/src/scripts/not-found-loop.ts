// Runs the wandering-pin loop only while the stage is on screen and the tab is visible.
const stage = document.querySelector<HTMLElement>('[data-lost-stage]');

const inner = stage?.querySelector<HTMLElement>('[data-lost-inner]');

if (stage && inner) {
  // The route is drawn at 640 CSS px; scale it to the stage width.
  const fit = () => inner.style.setProperty('transform', `scale(${stage.clientWidth / 640})`);
  new ResizeObserver(fit).observe(stage);
  fit();
  const button = document.querySelector<HTMLButtonElement>('[data-lost-pause]');
  const label = button?.querySelector('span');
  let onScreen = true;
  let paused = false;
  const sync = () => {
    stage.dataset.running = String(onScreen && !document.hidden && !paused);
  };
  button?.addEventListener('click', () => {
    paused = !paused;
    button.setAttribute('aria-pressed', String(paused));
    if (label) label.textContent = paused ? 'Play animation' : 'Pause animation';
    sync();
  });
  new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    sync();
  }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  sync();
}
