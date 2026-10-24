import { translateText } from '@/i18n/runtime';

const motion: KeyframeAnimationOptions = {
  duration: 480,
  easing: 'cubic-bezier(0.16,1,0.3,1)'
};

function keyboardIndex(event: KeyboardEvent, index: number, last: number) {
  if (event.key === 'Home') return 0;
  if (event.key === 'End') return last;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') return Math.min(last, index + 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') return Math.max(0, index - 1);
  return null;
}

export function setupAiBackground(root: HTMLElement) {
  const controls = [...root.querySelectorAll<HTMLButtonElement>('[data-background-step]')];
  const items = [...root.querySelectorAll<HTMLElement>('[data-background-item]')];
  const toggle = root.querySelector<HTMLButtonElement>('[data-background-toggle]');
  const replay = root.querySelector<HTMLButtonElement>('[data-background-replay]');
  const job = root.querySelector<HTMLElement>('[data-background-job]');
  if (!controls.length || controls.length !== items.length) return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const last = controls.length - 1;
  let reduced = preference.matches;
  let current = reduced ? last : 0;
  let paused = false;
  let onScreen = false;
  let focusHeld = false;
  let timer = 0;

  const cancelTimer = () => {
    window.clearTimeout(timer);
    timer = 0;
  };
  const canPlay = () => !reduced && !paused && !focusHeld && onScreen && !document.hidden;
  const syncPlayback = () => {
    root.dataset.playing = String(canPlay());
    if (!canPlay()) cancelTimer();
  };
  const schedule = (delay = 3900) => {
    cancelTimer();
    syncPlayback();
    if (!canPlay()) return;
    timer = window.setTimeout(() => select(current === last ? 0 : current + 1, true), delay);
  };
  const hasHeldFocus = () => {
    const active = document.activeElement;
    return (
      active instanceof Element &&
      root.contains(active) &&
      !active.closest('[data-background-toggle], [data-background-replay]')
    );
  };

  const updateJob = (selected: HTMLButtonElement | undefined, moving: boolean, focus: boolean) => {
    if (!selected) return;
    if (focus) selected.focus();
    const nextJob = selected.dataset.job ?? '';
    if (!job || job.textContent === nextJob) return;
    job.replaceChildren(nextJob);
    if (!moving) return;
    job.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' }
      ],
      { ...motion, duration: 340 }
    );
  };

  const updateItems = () => {
    items.forEach((item, index) => {
      item.hidden = false;
      item.dataset.state = index > current ? 'pending' : index === current ? 'current' : 'done';
    });
    root.querySelectorAll<HTMLElement>('[data-review-evidence]').forEach((card) => {
      const index = Number(card.dataset.reviewEvidence);
      card.dataset.state = index > current ? 'pending' : index === current ? 'current' : 'done';
    });
  };

  const select = (next: number, animate = false, focus = false) => {
    root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    current = Math.max(0, Math.min(last, next));
    const moving = animate && !reduced;
    const selected = controls[current];
    root.dataset.current = String(current);
    job?.parentElement?.setAttribute('aria-live', paused || reduced ? 'polite' : 'off');

    controls.forEach((control, index) => {
      const active = index === current;
      control.setAttribute('aria-pressed', String(active));
      control.tabIndex = active ? 0 : -1;
    });
    updateJob(selected, moving, focus);
    updateItems();
    schedule(moving ? 4400 : 3900);
  };

  controls.forEach((control, index) => {
    control.addEventListener('click', () => {
      paused = true;
      root.toggleAttribute('data-paused', true);
      toggle?.setAttribute('aria-pressed', 'true');
      toggle?.querySelector('.visually-hidden')?.replaceChildren(translateText('Play the example'));
      select(index, true);
    });
    control.addEventListener('keydown', (event) => {
      const next = keyboardIndex(event, index, last);
      if (next === null) return;
      event.preventDefault();
      select(next, true, true);
    });
  });

  replay?.addEventListener('click', () => {
    paused = false;
    root.toggleAttribute('data-paused', false);
    toggle?.setAttribute('aria-pressed', 'false');
    toggle?.querySelector('.visually-hidden')?.replaceChildren(translateText('Pause the example'));
    select(0, true);
    schedule(1800);
  });
  root.addEventListener('focusin', () => {
    focusHeld = hasHeldFocus();
    select(current, false);
  });
  root.addEventListener('focusout', () => {
    queueMicrotask(() => {
      focusHeld = hasHeldFocus();
      schedule(2200);
    });
  });

  if (toggle) {
    toggle.hidden = reduced;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.toggleAttribute('data-paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle
        .querySelector('.visually-hidden')
        ?.replaceChildren(translateText(paused ? 'Play the example' : 'Pause the example'));
      select(current, false);
      if (!paused) schedule(1000);
    });
  }
  preference.addEventListener('change', (event) => {
    reduced = event.matches;
    if (toggle) toggle.hidden = reduced;
    select(reduced ? last : current, false);
    schedule(1000);
  });
  document.addEventListener('visibilitychange', () => {
    select(current, false);
    if (!document.hidden) schedule(1000);
  });
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (!onScreen) {
        select(current, false);
        return;
      }
      schedule(1800);
    },
    { threshold: 0.2 }
  ).observe(root);

  root.dataset.ready = '';
  select(current, false);
}
