import { translateText } from '@/i18n/runtime';

// Runs the wandering-pin loop only while the stage is on screen and the tab is visible.
const stage = document.querySelector<HTMLElement>('[data-lost-stage]');

const inner = stage?.querySelector<HTMLElement>('[data-lost-inner]');

if (stage && inner) {
  // The route is drawn at 640 CSS px; scale it to the stage width.
  const fit = () => inner.style.setProperty('transform', `scale(${stage.clientWidth / 640})`);
  new ResizeObserver(fit).observe(stage);
  fit();
  const button = document.querySelector<HTMLButtonElement>('[data-lost-pause]');
  let onScreen = true;
  let paused = false;
  const sync = () => {
    stage.dataset.running = String(onScreen && !document.hidden && !paused);
  };
  button?.addEventListener('click', () => {
    const before = [...stage.querySelectorAll<HTMLElement>('.log li')].map(
      (li) => getComputedStyle(li).opacity
    );
    paused = !paused;
    button.dataset.paused = String(paused);
    const label = button.querySelector('[data-lost-label]');
    if (label) label.textContent = translateText(paused ? 'Play animation' : 'Pause animation');
    sync();
    // Settle the sentence to its resting line with a short fade instead of snapping.
    if (paused) {
      stage.querySelectorAll<HTMLElement>('.log li').forEach((li, i) => {
        li.animate([{ opacity: before[i] ?? '0' }, {}], {
          duration: 350,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        });
      });
    }
  });
  new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    sync();
  }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  sync();
}
