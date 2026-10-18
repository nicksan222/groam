const ease = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const rest = 35;

/**
 * A range input drives how much of "with this idea" covers the live plan. On wide screens the
 * divider starts at the far edge and sweeps once to its resting spot when scrolled into view.
 * Below 640px, two buttons switch between the versions instead.
 */
export function splitCompare(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('[data-slide]');
  const stage = root.querySelector<HTMLElement>('.stage');
  if (!input || !stage) return;
  const set = (value: number) => {
    input.value = String(value);
    stage.style.setProperty('--cut', `${value}%`);
  };
  input.addEventListener('input', () => set(Number(input.value)));
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-mode-btn]')) {
    button.addEventListener('click', () => {
      stage.dataset.mode = button.dataset.modeBtn;
      for (const other of root.querySelectorAll<HTMLButtonElement>('[data-mode-btn]')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
    });
  }
  set(rest);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  set(100);
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      window.setTimeout(sweep, 250);
    },
    { threshold: 0.6 }
  );
  const sweep = () => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / 1600, 1);
      set(100 - (100 - rest) * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  observer.observe(root);
}
