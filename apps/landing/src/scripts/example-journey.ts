import { translateText } from '@/i18n/runtime';
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
const holdMs = 4800;

type MessagePositions = Map<string, DOMRect>;

/** A non-interactive outgoing print keeps the old scene visible while its replacement settles. */
function fadeSnapshot(panel: HTMLElement): void {
  const ghost = panel.cloneNode(true) as HTMLElement;
  for (const element of [ghost, ...ghost.querySelectorAll('*')]) {
    element.removeAttribute('id');
    element.removeAttribute('aria-labelledby');
    for (const name of element.getAttributeNames()) {
      if (name.startsWith('data-journey') || name === 'data-plan-state') {
        element.removeAttribute(name);
      }
    }
  }
  ghost.hidden = false;
  ghost.inert = true;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.dataset.motionGhost = '';
  ghost.classList.add('journey-ghost');
  panel.parentElement?.append(ghost);
  const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 260,
    easing: ease,
    fill: 'forwards'
  });
  const remove = () => ghost.remove();
  void fade.finished.then(remove, remove);
}

function messagePositions(panel: HTMLElement | undefined): MessagePositions {
  return new Map(
    [...(panel?.querySelectorAll<HTMLElement>('.message') ?? [])].map((message) => [
      message.textContent?.trim() ?? '',
      message.getBoundingClientRect()
    ])
  );
}

/** Existing lines keep their place in the conversation; a new reply is printed into it. */
function animateMessages(panel: HTMLElement, before: MessagePositions): void {
  let arrivals = 0;
  for (const message of panel.querySelectorAll<HTMLElement>('.message')) {
    const was = before.get(message.textContent?.trim() ?? '');
    const delta = was ? was.top - message.getBoundingClientRect().top : 14;
    message.animate(
      [
        {
          opacity: was ? 1 : 0,
          transform: `translateY(${delta}px)`,
          clipPath: was ? 'inset(0)' : 'inset(0 0 100% 0)'
        },
        { opacity: 1, transform: 'none', clipPath: 'inset(0)' }
      ],
      {
        duration: 540,
        delay: was ? 0 : Math.min(arrivals++ * 75, 300),
        easing: ease,
        fill: 'backwards'
      }
    );
  }
}

/** The draft lifts while it is being revised, then presses flush when it becomes the plan. */
function animateSnapshot(panel: HTMLElement, before: MessagePositions, planChanged: boolean): void {
  animateMessages(panel, before);
  panel.querySelector('.panel-head')?.animate(
    [
      { opacity: 0, transform: 'translateY(5px)' },
      { opacity: 1, transform: 'none' }
    ],
    { duration: 420, delay: 80, easing: ease, fill: 'backwards' }
  );
  const applied = panel.dataset.planState === 'applied';
  panel.querySelector('.change-sheet')?.animate(
    [
      {
        transform: applied
          ? 'translateY(-14px) rotate(-1.2deg) scale(1.025)'
          : 'translateX(18px) rotate(0.8deg)',
        opacity: 0.5
      },
      { transform: applied ? 'none' : 'rotate(-1deg) translateY(-3px)', opacity: 1 }
    ],
    { duration: applied ? 720 : 560, easing: ease }
  );
  if (!planChanged) return;
  panel.querySelectorAll('.plan-rows li').forEach((row, index) => {
    row.animate(
      [
        { opacity: 0, transform: 'translateX(16px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: 480, delay: index * 75, easing: ease, fill: 'backwards' }
    );
  });
}

/** Progressively enhances the readable story. Only the home story plays automatically. */
export function setupExampleJourney(root: HTMLElement): void {
  if (root.dataset.ready === 'true') return;
  const panels = [...root.querySelectorAll<HTMLElement>('[data-journey-panel]')];
  const steps = [...root.querySelectorAll<HTMLButtonElement>('[data-journey-step]')];
  const previous = root.querySelector<HTMLButtonElement>('[data-journey-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-journey-next]');
  const replay = root.querySelector<HTMLButtonElement>('[data-journey-replay]');
  const progress = root.querySelector<HTMLElement>('[data-journey-progress]');
  const live = root.querySelector<HTMLElement>('[data-journey-live]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-journey-toggle]');
  if (!panels.length || panels.length !== steps.length) return;

  const autoplay = root.hasAttribute('data-autoplay');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = autoplay ? (motion.matches ? panels.length - 1 : 2) : 0;
  let paused = false;
  let onScreen = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let progressMotion: Animation | undefined;
  let measuredWidth = 0;

  const cancelMotion = () => {
    for (const animation of root.getAnimations({ subtree: true })) animation.cancel();
    root.querySelectorAll('[data-motion-ghost]').forEach((ghost) => ghost.remove());
  };
  const running = () =>
    autoplay &&
    !motion.matches &&
    !paused &&
    onScreen &&
    document.visibilityState === 'visible' &&
    !root.matches(':has(:focus-visible:not([data-journey-toggle]))');

  const renderControls = () => {
    const focused = root.ownerDocument.activeElement;
    if (previous) previous.disabled = current === 0;
    if (next) next.hidden = current === panels.length - 1;
    if (replay) replay.hidden = current !== panels.length - 1;
    if (progress) progress.textContent = `${current + 1} / ${panels.length}`;
    if (live) live.textContent = panels[current]?.querySelector('h3')?.textContent?.trim() ?? '';
    if (
      focused?.matches(
        '[data-journey-prev]:disabled, [data-journey-next][hidden], [data-journey-replay][hidden]'
      )
    )
      steps[current]?.focus();
  };

  const schedule = () => {
    clearTimeout(timer);
    progressMotion?.cancel();
    const play = running();
    root.dataset.playing = String(play);
    live?.setAttribute('aria-live', play ? 'off' : 'polite');
    if (!play) return;
    progressMotion = steps[current]
      ?.querySelector('.step-progress')
      ?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: holdMs,
        easing: 'linear',
        fill: 'forwards'
      });
    timer = setTimeout(() => show((current + 1) % panels.length, true), holdMs);
  };

  const show = (index: number, animate = false): void => {
    const before = panels[current];
    cancelMotion();
    const positions = messagePositions(before);
    current = Math.max(0, Math.min(index, panels.length - 1));
    if (animate && !motion.matches && before && before !== panels[current]) fadeSnapshot(before);
    panels.forEach((panel, i) => {
      panel.hidden = i !== current;
    });
    steps.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === current));
      button.tabIndex = i === current ? 0 : -1;
    });
    root.dataset.current = String(current);
    renderControls();
    const panel = panels[current];
    if (panel && animate && !motion.matches) {
      animateSnapshot(panel, positions, before?.dataset.planState !== panel.dataset.planState);
    }
    schedule();
  };

  // Reserve the largest snapshot once per width, so a new reply never pushes the page around.
  const measure = () => {
    if (!autoplay) return;
    root.setAttribute('data-measuring', '');
    panels.forEach((panel) => {
      panel.hidden = false;
    });
    const height =
      root.querySelector<HTMLElement>('.journey-stage')?.getBoundingClientRect().height ?? 0;
    root.style.setProperty('--journey-height', `${Math.ceil(height)}px`);
    panels.forEach((panel, i) => {
      panel.hidden = i !== current;
    });
    root.removeAttribute('data-measuring');
  };

  const manual = (index: number) => show(index, true);
  steps.forEach((button, index) => {
    button.addEventListener('click', () => manual(index));
    button.addEventListener('keydown', (event) => {
      const targets: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: steps.length - 1
      };
      const target = targets[event.key];
      if (target === undefined) return;
      event.preventDefault();
      const bounded = Math.max(0, Math.min(target, steps.length - 1));
      steps[bounded]?.focus();
      manual(bounded);
    });
  });
  previous?.addEventListener('click', () => manual(current - 1));
  next?.addEventListener('click', () => manual(current + 1));
  replay?.addEventListener('click', () => manual(0));
  toggle?.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute(
      'aria-label',
      translateText(paused ? 'Play the group story' : 'Pause the group story')
    );
    const label = toggle.querySelector('[data-toggle-label]');
    if (label) label.textContent = translateText(paused ? 'Play' : 'Pause');
    cancelMotion();
    schedule();
  });

  root.dataset.ready = 'true';
  if (toggle) toggle.hidden = motion.matches;
  measure();
  show(current);
  if (!autoplay) return;
  new ResizeObserver(() => {
    const width = root.getBoundingClientRect().width;
    if (width === measuredWidth) return;
    measuredWidth = width;
    cancelMotion();
    measure();
    schedule();
  }).observe(root);
  void document.fonts.ready.then(measure);
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (!onScreen) cancelMotion();
      schedule();
    },
    { threshold: 0.12 }
  ).observe(root);
  document.addEventListener('visibilitychange', () => {
    cancelMotion();
    schedule();
  });
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => {
    queueMicrotask(schedule);
  });
  motion.addEventListener('change', () => {
    if (toggle) toggle.hidden = motion.matches;
    show(motion.matches ? panels.length - 1 : current);
  });
}
