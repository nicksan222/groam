import { updateLoopControl } from '@/scripts/loop-control';
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
  let progress: Animation | undefined;

  const previews = root.querySelector<HTMLElement>('.previews');
  const fit = (i: number) => {
    const panel = panels[i];
    if (!previews || !panel) return;
    // Stacked above the list, the stage holds the tallest preview so nothing below ever moves.
    const tallest = Math.max(...panels.map((item) => item.offsetHeight));
    const list = root.querySelector<HTMLElement>('.list');
    const stacked = matchMedia('(max-width: 860px)').matches;
    const beside = !stacked && !!list && tallest + 80 < list.offsetHeight;
    previews.style.height = `${beside ? panel.offsetHeight : tallest}px`;
  };

  const select = (i: number) => {
    progress?.cancel();
    progress = undefined;
    current = i;
    items.forEach((item, n) => {
      const on = n === i;
      item.classList.toggle('active', on);
      item.querySelector('button')?.setAttribute('aria-pressed', String(on));
    });
    fit(i);
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
    root.classList.toggle('holding', !running());
    if (!running()) {
      progress?.pause();
      return;
    }
    if (progress) {
      progress.play();
      return;
    }
    const bar = items[current]?.querySelector<HTMLElement>('.bar');
    if (!bar) return;
    // One clock owns both the visible interval and the handoff to the next item.
    const animation = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: dwellMs,
      easing: 'linear',
      fill: 'forwards'
    });
    progress = animation;
    void animation.finished.then(
      () => {
        if (progress !== animation) return;
        select((current + 1) % items.length);
        schedule();
      },
      () => {}
    );
  };

  items.forEach((item, n) => {
    const button = item.querySelector('button');
    const choose = () => {
      if (n !== current) select(n);
      schedule();
    };
    button?.addEventListener('click', choose);
    button?.addEventListener('focus', choose);
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
      updateLoopControl(toggle, paused, {
        play: 'Play the feature tour',
        pause: 'Pause the feature tour'
      });
      inside = false;
      schedule();
    });
  }

  root.classList.add('sized');
  select(0);
  addEventListener('resize', () => fit(current));
  void document.fonts?.ready.then(() => fit(current));
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  }).observe(root);
}
