const dwellMs = 5200;

/**
 * Feature explorer: one list, one live preview. Hover, focus, or click selects an item; left alone
 * it advances forever. It holds while the pointer or focus is inside, while paused, off screen,
 * or with the tab hidden. Under reduced motion it never advances on its own.
 */
export function playFeaturesHub(root: HTMLElement): void {
  const items = [...root.querySelectorAll<HTMLElement>('[data-item]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-preview]')];
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]');
  if (items.length === 0 || items.length !== panels.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let paused = false;
  let inside = false;
  let onScreen = false;
  let timer: number | undefined;

  const select = (i: number) => {
    current = i;
    items.forEach((item, n) => {
      const on = n === i;
      item.classList.toggle('active', on);
      item.querySelector('button')?.setAttribute('aria-pressed', String(on));
      // Restart the progress bar from zero.
      if (on) {
        item.classList.remove('run');
        void item.offsetWidth;
        item.classList.add('run');
      }
    });
    panels.forEach((panel, n) => {
      const on = n === i;
      panel.classList.toggle('active', on);
      panel.inert = !on;
      panel.setAttribute('aria-hidden', String(!on));
    });
  };

  const running = () =>
    !reduced && onScreen && !paused && !inside && document.visibilityState === 'visible';

  const schedule = () => {
    window.clearTimeout(timer);
    timer = undefined;
    root.classList.toggle('holding', !running());
    if (!running()) return;
    timer = window.setTimeout(() => {
      select((current + 1) % items.length);
      schedule();
    }, dwellMs);
  };

  items.forEach((item, n) => {
    const button = item.querySelector('button');
    const choose = () => {
      if (n !== current) select(n);
      schedule();
    };
    button?.addEventListener('click', choose);
    button?.addEventListener('focus', choose);
    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') choose();
    });
  });

  const isToggle = (target: EventTarget | null) =>
    !!toggle && target instanceof Node && toggle.contains(target);
  root.addEventListener('pointerover', (event) => {
    inside = !isToggle(event.target);
    schedule();
  });
  root.addEventListener('pointerleave', () => {
    inside = false;
    schedule();
  });
  root.addEventListener('focusin', (event) => {
    inside = !isToggle(event.target);
    schedule();
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) {
      inside = false;
      schedule();
    }
  });
  document.addEventListener('visibilitychange', schedule);

  if (toggle && !reduced) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
      inside = false;
      if (!paused && running()) select((current + 1) % items.length);
      schedule();
    });
  }

  select(0);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  }).observe(root);
}
