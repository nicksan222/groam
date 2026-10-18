const dwellMs = 3600;

type State = { chip: string; tone: string; foot: string };

/**
 * Step-through for the example idea: Propose, Review, Apply. Steps are buttons (click, Enter, Space,
 * arrow keys). Autoplay loops while on screen and can be paused; choosing a step pauses it.
 * Without script, or under reduced motion, the card rests on its finished Applied state.
 */
export function initIdeaThread(root: HTMLElement): void {
  const card = root.querySelector<HTMLElement>('[data-card]');
  const chip = root.querySelector<HTMLElement>('[data-chip]');
  const foot = root.querySelector<HTMLElement>('[data-foot]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-autoplay]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-step-button]')];
  const states: State[] = JSON.parse(root.dataset.states ?? '[]');
  if (
    !card ||
    !chip ||
    !foot ||
    !toggle ||
    buttons.length === 0 ||
    states.length !== buttons.length
  )
    return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const last = buttons.length - 1;
  let current = last;
  let wantsPlay = !reduced;
  let onScreen = false;
  let timer: number | undefined;

  const restartBar = () => {
    root.classList.remove('bar');
    void root.offsetWidth;
    root.classList.add('bar');
  };

  const show = (index: number, animate: boolean) => {
    const changed = index !== current;
    current = index;
    card.dataset.step = String(index);
    buttons.forEach((button, i) => {
      const item = button.closest('li');
      item?.classList.toggle('active', i === index);
      item?.classList.toggle('done', i < index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    for (const time of root.querySelectorAll<HTMLElement>('[data-early]')) {
      time.textContent = index === 0 ? (time.dataset.early ?? '') : (time.dataset.final ?? '');
    }
    const state = states[index];
    if (!state) return;
    chip.textContent = state.chip;
    chip.className = `chip ${state.tone}`;
    foot.textContent = state.foot;
    if (animate && changed && !reduced) {
      chip.animate(
        [
          { transform: 'scale(0.85)', opacity: 0.4 },
          { transform: 'none', opacity: 1 }
        ],
        { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    }
    if (timerRunning()) restartBar();
  };

  const timerRunning = () => timer !== undefined;

  const sync = () => {
    const running = wantsPlay && onScreen && document.visibilityState === 'visible';
    window.clearTimeout(timer);
    timer = undefined;
    root.classList.toggle('playing', running);
    if (!running) return;
    const tick = () => {
      show((current + 1) % buttons.length, true);
      timer = window.setTimeout(tick, dwellMs);
    };
    timer = window.setTimeout(tick, dwellMs);
    restartBar();
  };

  const setPlay = (value: boolean) => {
    wantsPlay = value;
    toggle.setAttribute('aria-pressed', String(!value));
    root.classList.toggle('autoplay-off', !value);
    sync();
  };

  buttons.forEach((button, index) => {
    const select = () => {
      setPlay(false);
      show(index, true);
    };
    button.addEventListener('click', select);
    button.closest('li')?.addEventListener('click', (event) => {
      if (event.target !== button) select();
    });
    button.addEventListener('keydown', (event) => {
      const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (delta === undefined) return;
      event.preventDefault();
      const target = buttons[(index + delta + buttons.length) % buttons.length];
      target?.focus();
      setPlay(false);
      show((index + delta + buttons.length) % buttons.length, true);
    });
  });

  toggle.hidden = false;
  toggle.addEventListener('click', () => setPlay(!wantsPlay));
  setPlay(wantsPlay);
  if (reduced) toggle.hidden = true;

  document.addEventListener('visibilitychange', sync);
  let started = false;
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen && !started && wantsPlay) {
        started = true;
        show(0, false);
      }
      sync();
    },
    { threshold: 0.4 }
  ).observe(card);
}
