import { updateLoopControl } from '@/scripts/loop-control';
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
const lifted = 'rotate(-0.8deg) translateY(-3px)';

/** One beat of the loop: what changes, then how long it holds before the next beat. */
type Beat = { run: () => void; hold: number };

/** Fades text out, swaps it, and fades it back in with a small rise. Settles on its own. */
function swapText(
  element: Element | null,
  text: string | undefined,
  animate: (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => Animation
): void {
  if (!element || text === undefined || element.textContent === text) return;
  const out = animate(element, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-4px)' }], {
    duration: 180,
    easing: ease
  });
  void out.finished
    .then(() => {
      element.textContent = text;
      animate(
        element,
        [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'none' }
        ],
        {
          duration: 360,
          easing: ease
        }
      );
    })
    .catch(() => {});
}

/**
 * Plays the example week on the home bill. Each day is a printed sheet in a pile, and each day
 * plays its own story when it comes to the top: an issue closed by an agent's idea, a chat that
 * settles fado, an idea that gets changes requested and revised, an agent's beach research, an
 * agent's edit, an issue still open, a quiet agreed Sunday. The markup ships the finished still
 * (Monday on top, every day at its end state), so reduced motion and no script both show the true
 * end of the week. Runs only on screen, in a visible tab, and while not paused.
 */
export function playDayPile(pile: HTMLElement): void {
  const toggle = pile.querySelector<HTMLButtonElement>('[data-toggle]');
  const boards = [...pile.querySelectorAll<HTMLElement>('[data-board]')];
  if (!toggle || boards.length === 0) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /** Bring one day to the front; the rest follow in week order behind it. */
  const front = (index: number) => {
    boards.forEach((board, i) => {
      const offset = (i - index + boards.length) % boards.length;
      board.style.setProperty('--pos', String(offset));
      board.toggleAttribute('data-front', offset === 0);
      board.toggleAttribute('data-far', offset > 2);
      board.inert = offset !== 0;
      if (offset === 0) board.removeAttribute('aria-hidden');
      else board.setAttribute('aria-hidden', 'true');
    });
  };

  const events = (board: HTMLElement) => [...board.querySelectorAll<HTMLElement>('[data-event]')];
  const strip = (board: HTMLElement) => board.querySelector<HTMLElement>('[data-strip]');
  const stripTimes = (board: HTMLElement) => [...board.querySelectorAll('[data-strip-time]')];
  const status = (board: HTMLElement) => board.querySelector<HTMLElement>('[data-status-text]');
  const tab = (board: HTMLElement) => board.querySelector<HTMLElement>('[data-tab]');
  const revisions = (event: HTMLElement): [number, string, string][] =>
    event.dataset.revise ? (JSON.parse(event.dataset.revise) as [number, string, string][]) : [];

  // Remember each board's end state so a new pass can rewind to the start and play to it again.
  const endTab = new Map(boards.map((board) => [board, tab(board)?.textContent ?? '']));

  /** Back to the start of the week, crossfading anything a visitor can see. */
  const rewind = (board: HTMLElement) => {
    board.dataset.stage = 'plan';
    for (const event of events(board)) {
      event.classList.add('pending');
      for (const [row, before] of revisions(event))
        swapText(stripTimes(board)[row] ?? null, before, animate);
    }
    const line = status(board);
    swapText(line, line?.dataset.start, animate);
    const label = tab(board);
    swapText(label, label?.dataset.before, animate);
  };

  const stage = (board: HTMLElement, next: string) => {
    const was = board.dataset.stage;
    board.dataset.stage = next;
    const paste = strip(board);
    if (!paste) return;
    if (next === 'proposed' && was === 'plan') {
      animate(
        paste,
        [
          { transform: 'translateY(-4px) rotate(-1.2deg)', opacity: 0 },
          { offset: 0.14, opacity: 1 },
          { transform: lifted, opacity: 1 }
        ],
        { duration: 900, easing: ease }
      );
    }
    if (next === 'applied') {
      animate(paste, [{ transform: lifted }, { transform: 'none' }], {
        duration: 700,
        easing: ease
      });
    }
  };

  const land = (board: HTMLElement, event: HTMLElement) => {
    event.classList.remove('pending');
    if (event.dataset.stage) stage(board, event.dataset.stage);
    for (const [row, , after] of revisions(event))
      swapText(stripTimes(board)[row] ?? null, after, animate);
    swapText(status(board), event.dataset.status, animate);
  };

  /** The beats one day plays once it is on top. */
  const dayBeats = (board: HTMLElement): Beat[] => {
    const lines = events(board);
    if (lines.length === 0) return [{ run: () => {}, hold: 2600 }];
    return [
      ...lines.map((event, i) => ({
        run: () => land(board, event),
        hold:
          event.dataset.stage === 'proposed' || event.dataset.revise ? 1700 : i === 0 ? 1200 : 1300
      })),
      { run: () => swapText(tab(board), endTab.get(board), animate), hold: 1800 }
    ];
  };

  const loop = (): Beat[] => [
    {
      run: () => {
        boards.forEach(rewind);
        front(0);
      },
      hold: 1200
    },
    ...boards.flatMap((board, index) =>
      index === 0 ? dayBeats(board) : [{ run: () => front(index), hold: 1000 }, ...dayBeats(board)]
    )
  ];

  let beats = loop();
  let beat = 0;
  let paused = false;
  let onScreen = false;
  let timer: number | undefined;
  let wait = 0;
  const active = new Set<Animation>();

  const running = () => !paused && onScreen && document.visibilityState === 'visible';

  const animate = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = element.animate(frames, options);
    active.add(animation);
    if (!running()) animation.pause();
    void animation.finished.catch(() => {}).finally(() => active.delete(animation));
    return animation;
  };

  /** CSS transitions are animations too; freeze them with the explicit text and strip motion. */
  const syncMotion = () => {
    const animations = new Set([...active, ...pile.getAnimations({ subtree: true })]);
    animations.forEach((animation) => {
      if (animation.playState === 'finished' || animation.playState === 'idle') return;
      if (running()) animation.play();
      else animation.pause();
    });
  };

  const schedule = (ms = wait) => {
    window.clearTimeout(timer);
    timer = undefined;
    wait = ms;
    syncMotion();
    if (!running()) return;
    timer = window.setTimeout(tick, ms);
  };

  function tick() {
    const current = beats[beat];
    if (!current) {
      beats = loop();
      beat = 0;
      tick();
      return;
    }
    current.run();
    syncMotion();
    beat += 1;
    schedule(current.hold);
  }

  // Open on the week as first planned; the finished still is only for no-motion.
  tick();

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    pile.classList.toggle('paused', paused);
    updateLoopControl(toggle, paused, {
      play: 'Play the example trip',
      pause: 'Pause the example trip'
    });
    schedule();
  });
  document.addEventListener('visibilitychange', () => schedule());
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    schedule();
  }).observe(pile);
}
