const dwellMs = 2400;
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
/**
 * Plays the example trip log once through, then crossfades the card back to its opening state.
 * The list sits in a fixed-height clip; the next entry waits just below it and the whole list slides
 * up by the outgoing row's height, so nothing around the card moves. Every entry plays once per
 * pass and keeps its own timestamp, all before the trip starts. Stops under reduced motion, while
 * off screen, while the tab is hidden, and while the viewer has paused it.
 */
export function playActivityLog(log: HTMLElement): void {
  const list = log.querySelector<HTMLOListElement>('[data-entries]');
  const clip = log.querySelector<HTMLElement>('[data-clip]');
  const toggle = log.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!list || !clip || !toggle) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const items = () => [...list.children] as HTMLLIElement[];
  const original = items();
  const visibleCount = original.filter((item) => !item.hidden).length;
  let paused = false;
  let onScreen = false;
  let busy = false;
  let timer: number | undefined;

  const visibleItems = () => items().filter((item) => !item.hidden);
  const sumHeights = (rows: HTMLElement[]) =>
    rows.reduce((total, row) => total + row.offsetHeight, 0);
  let clipHeight = 0;

  /** Pin the newest entry to the bottom edge: spare room sits above the oldest, which the slide hides. */
  const pin = (rows: HTMLElement[]) => {
    list.style.marginTop = `${clipHeight - sumHeights(rows)}px`;
    rows.forEach((row, i) => row.classList.toggle('first', i === 0));
  };

  /** The card is sized to the opening entries, so it is full at load and never resizes. */
  const reserve = () => {
    if (busy || list.children.length !== original.length) return;
    list.style.marginTop = '0px';
    clipHeight = sumHeights(visibleItems());
    clip.style.height = `${clipHeight}px`;
    pin(visibleItems());
  };

  /** Fade the card out, restore the opening entries, fade back in. */
  const rewind = async () => {
    const fade = (from: number, to: number) =>
      clip.animate([{ opacity: from }, { opacity: to }], {
        duration: 400,
        easing: 'linear',
        fill: 'forwards'
      }).finished;
    await fade(1, 0).catch(() => {});
    list.replaceChildren(...original);
    original.forEach((item, i) => {
      item.hidden = i >= visibleCount;
      item.classList.toggle('now', i === visibleCount - 1);
    });
    pin(visibleItems());
    await fade(0, 1).catch(() => {});
    clip.getAnimations().forEach((animation) => animation.cancel());
  };

  const advance = async () => {
    const oldest = list.querySelector<HTMLLIElement>('li:not([hidden])');
    const next = list.querySelector<HTMLLIElement>('li[hidden]');
    busy = true;
    if (!oldest || !next) {
      await rewind();
      busy = false;
      return;
    }
    for (const entry of list.querySelectorAll('.now')) entry.classList.remove('now');

    next.hidden = false;
    next.classList.add('now');
    const shift = oldest.offsetHeight;
    oldest.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 380,
      easing: 'linear',
      fill: 'forwards'
    });
    const after = [...visibleItems().slice(1), next];
    const current = Number.parseFloat(list.style.marginTop) || 0;
    const target = clipHeight - sumHeights(after);
    const slide = list.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${target - current - shift}px)` }],
      { duration: 800, easing: ease, fill: 'forwards' }
    );
    next.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 700,
      delay: 150,
      easing: ease,
      fill: 'backwards'
    });
    next.querySelector('.detail')?.animate(
      [
        { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, clipPath: 'inset(0 0 0% 0)' }
      ],
      { duration: 700, delay: 350, easing: ease, fill: 'backwards' }
    );
    next.animate([{ backgroundColor: 'var(--primary-soft)' }, { backgroundColor: 'transparent' }], {
      duration: 1600,
      easing: ease
    });
    try {
      await slide.finished;
    } catch {
      /* cancelled */
    }
    oldest.remove();
    pin(visibleItems());
    slide.cancel();
    busy = false;
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = undefined;
    if (!onScreen || paused || document.visibilityState !== 'visible') return;
    timer = window.setTimeout(async () => {
      if (!busy) await advance();
      schedule();
    }, dwellMs);
  };

  reserve();
  let lastWidth = log.offsetWidth;
  new ResizeObserver(() => {
    if (log.offsetWidth === lastWidth) return;
    lastWidth = log.offsetWidth;
    reserve();
  }).observe(log);
  void document.fonts.ready.then(reserve);
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    log.classList.toggle('paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  }).observe(log);
}
