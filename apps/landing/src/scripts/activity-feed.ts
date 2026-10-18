import { updateLoopControl } from '@/scripts/loop-control';
const dwellMs = 2400;
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
/**
 * Plays the example trip log once through, then crossfades the card back to its opening state.
 * The newest entry grows in at the top and pushes older ones down past the bottom of a clip held at
 * a fixed height, so the card is always full and nothing around it moves. Every entry plays once per pass and
 * keeps its own timestamp. Stops under reduced motion, while off screen, while the tab is hidden,
 * and while the viewer has paused it.
 */
export function playActivityLog(log: HTMLElement): void {
  const list = log.querySelector<HTMLOListElement>('[data-entries]');
  const clip = log.querySelector<HTMLElement>('[data-clip]');
  const toggle = log.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!list || !clip || !toggle) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // The markup lists the opening entries newest first, then the rest (hidden) in order; `original`
  // is the chronological order the log plays in.
  const rendered = [...list.children] as HTMLLIElement[];
  const visibleCount = rendered.filter((item) => !item.hidden).length;
  const original = [...rendered.slice(0, visibleCount).reverse(), ...rendered.slice(visibleCount)];
  let queue: HTMLLIElement[] = [];
  let paused = false;
  let onScreen = false;
  let busy = false;
  let timer: number | undefined;
  /** Animations of the step in flight; paused with the log so it never changes behind the button. */
  const inFlight = new Set<Animation>();
  const resumeWaiters = new Set<() => void>();

  const running = () => !paused && onScreen && document.visibilityState === 'visible';

  const track = (animation: Animation) => {
    inFlight.add(animation);
    if (!running()) animation.pause();
    void animation.finished.catch(() => {}).finally(() => inFlight.delete(animation));
    return animation;
  };

  const syncMotion = () => {
    const isRunning = running();
    new Set([...inFlight, ...clip.getAnimations({ subtree: true })]).forEach((animation) => {
      if (animation.playState === 'finished' || animation.playState === 'idle') return;
      if (isRunning) animation.play();
      else animation.pause();
    });
    if (isRunning) {
      resumeWaiters.forEach((resume) => resume());
      resumeWaiters.clear();
    }
  };

  const waitUntilRunning = () =>
    running() ? Promise.resolve() : new Promise<void>((resolve) => resumeWaiters.add(resolve));

  const shown = () =>
    [...list.children].filter((item) => !(item as HTMLElement).hidden) as HTMLLIElement[];

  /** Newest on top: the opening entries reversed, the rest waiting in order. */
  const restore = () => {
    const opening = original.slice(0, visibleCount);
    list.replaceChildren(...[...opening].reverse());
    original.forEach((item, i) => {
      item.hidden = i >= visibleCount;
      item.classList.toggle('now', i === visibleCount - 1);
      item.style.removeProperty('height');
      item.getAnimations().forEach((animation) => animation.cancel());
    });
    queue = original.slice(visibleCount);
  };

  /**
   * The clip is held at the height of the opening entries, so the card never resizes and nothing
   * below it moves. New entries push older ones down past the bottom edge, so the card is always
   * full: there is never a blank band.
   */
  const reserve = () => {
    if (busy) return;
    const opening = shown().slice(0, visibleCount);
    // The fold overlaps the clip's foot while the log runs; reserve its height so the opening
    // entries rest whole above it, exactly as tall as the still card.
    const fold = log.querySelector<HTMLElement>('.earlier')?.offsetHeight ?? 0;
    const rows = opening.reduce((sum, item) => sum + item.getBoundingClientRect().height, 0);
    // Rounded down once, so the fold always covers the last entry's rule instead of doubling it.
    clip.style.height = `${Math.floor(rows + fold)}px`;
  };

  /** Fade the card out, restore the opening entries, fade back in. */
  const rewind = async () => {
    const fade = (from: number, to: number) =>
      track(
        clip.animate([{ opacity: from }, { opacity: to }], {
          duration: 450,
          easing: ease,
          fill: 'forwards'
        })
      ).finished;
    await fade(1, 0).catch(() => {});
    await waitUntilRunning();
    restore();
    await fade(0, 1).catch(() => {});
    await waitUntilRunning();
    clip.getAnimations().forEach((animation) => animation.cancel());
  };

  /** Drop entries that have slid fully below the clip; they are out of sight already. */
  const prune = () => {
    const bottom = clip.getBoundingClientRect().bottom;
    for (const item of shown()) {
      if (item.getBoundingClientRect().top < bottom) continue;
      item.getAnimations().forEach((animation) => animation.cancel());
      item.remove();
    }
  };

  /** The next entry grows in at the top and pushes the rest down; the clip cuts the oldest off. */
  const advance = async () => {
    const next = queue.shift();
    busy = true;
    if (!next) {
      await rewind();
      busy = false;
      return;
    }
    for (const entry of list.querySelectorAll('.now')) entry.classList.remove('now');

    list.prepend(next);
    next.hidden = false;
    next.classList.add('now');
    const height = next.offsetHeight;
    const grow = track(
      next.animate(
        [
          { height: '0px', opacity: 0, transform: 'translateY(-8px)' },
          { height: `${height}px`, opacity: 1, transform: 'none' }
        ],
        { duration: 800, easing: ease }
      )
    );
    await grow.finished.catch(() => {});
    await waitUntilRunning();
    prune();
    busy = false;
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = undefined;
    syncMotion();
    if (!running()) return;
    timer = window.setTimeout(async () => {
      if (!busy) await advance();
      schedule();
    }, dwellMs);
  };

  restore();
  reserve();
  log.classList.add('running');
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
    updateLoopControl(toggle, paused, { play: 'Play activity', pause: 'Pause activity' });
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  }).observe(log);
}
