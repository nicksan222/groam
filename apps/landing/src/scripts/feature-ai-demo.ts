const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The assistant demo: questions type in, the answer streams, and the rows it refers to light up.
 * The loop walks every question across the three screens forever. Visitors can switch the screen
 * in view or pick a question; the loop continues from there. It holds still while off screen,
 * while the tab is hidden, and while paused. Under reduced motion nothing autoplays and answers
 * appear whole.
 */
export function playAiDemo(root: HTMLElement): void {
  const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-screen]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const proposal = q('[data-proposal-row]');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-qa]')];
  const context = q('[data-context-text]');
  const question = q('[data-question]');
  const answer = q('[data-answer]');
  const reply = q('[data-reply]');
  const status = q('[data-status]');
  const toggle = q<HTMLButtonElement>('[data-toggle]');
  if (!context || !question || !answer || !reply || !status || chips.length === 0) return;

  let idx = 0;
  let token = 0;
  let paused = false;
  let onScreen = false;
  let alive = false;
  let started = false;
  let loopId = 0;
  const isReduced = reduced();

  const running = () => onScreen && !paused && document.visibilityState === 'visible';

  /** Waits `ms` of running time. Resolves false when a newer action superseded this one. */
  const sleep = async (ms: number, my: number) => {
    let elapsed = 0;
    while (elapsed < ms) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (my !== token) return false;
      if (running()) elapsed += 50;
    }
    return my === token;
  };

  const chipAt = (i: number): HTMLButtonElement =>
    chips[i] ?? chips[0] ?? document.createElement('button');
  const screenOf = (chip: HTMLElement) => chip.dataset.qa?.split(':')[0] ?? '';

  const showTabs = (screen: string) => {
    for (const tab of tabs) {
      const on = tab.dataset.screen === screen;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) context.textContent = tab.dataset.context ?? '';
    }
  };

  const showPanels = (screen: string) => {
    for (const panel of panels) {
      const on = panel.dataset.panel === screen;
      if (!on) panel.hidden = true;
      else if (panel.hidden) {
        panel.hidden = false;
        panel.classList.remove('arriving');
        void panel.offsetWidth;
        panel.classList.add('arriving');
      }
    }
  };

  /** Sets the screen, context chip, chips, and highlights without touching the text. */
  const frame = (i: number) => {
    const chip = chipAt(i);
    const screen = screenOf(chip);
    showTabs(screen);
    showPanels(screen);
    for (const c of chips) {
      c.hidden = screenOf(c) !== screen;
      c.setAttribute('aria-pressed', String(c === chip));
    }
    for (const row of root.querySelectorAll<HTMLElement>('[data-row]')) row.classList.remove('hl');
    proposal?.classList.remove('show');
  };

  const highlight = (i: number) => {
    proposal?.classList.toggle('show', chipAt(i).dataset.proposal === 'true');
    const ids = new Set((chipAt(i).dataset.highlight ?? '').split(','));
    for (const row of root.querySelectorAll<HTMLElement>('[data-row]'))
      row.classList.toggle('hl', ids.has(row.dataset.row ?? ''));
  };

  const settle = (i: number) => {
    const chip = chipAt(i);
    question.textContent = chip.dataset.question ?? '';
    answer.textContent = chip.dataset.answer ?? '';
    reply.classList.remove('thinking');
    question.classList.remove('typing');
    answer.classList.remove('typing');
    status.textContent = `${chip.dataset.question} ${chip.dataset.answer}`;
    highlight(i);
  };

  /** Plays one question: type it, think, stream the answer, light the rows. */
  const play = async (i: number): Promise<boolean> => {
    const my = ++token;
    idx = i;
    frame(i);
    const text = chipAt(i).dataset.question ?? '';
    const words = (chipAt(i).dataset.answer ?? '').split(' ');
    status.textContent = '';
    answer.textContent = '';
    question.textContent = '';
    reply.classList.add('thinking');
    question.classList.add('typing');
    for (let n = 1; n <= text.length; n++) {
      if (!(await sleep(22 + Math.random() * 22, my))) return false;
      question.textContent = text.slice(0, n);
    }
    question.classList.remove('typing');
    if (!(await sleep(700, my))) return false;
    reply.classList.remove('thinking');
    answer.classList.add('typing');
    highlight(i);
    for (let n = 1; n <= words.length; n++) {
      if (!(await sleep(70, my))) return false;
      answer.textContent = words.slice(0, n).join(' ');
    }
    answer.classList.remove('typing');
    settle(i);
    return true;
  };

  const next = (i: number) => (i + 1) % chips.length;

  const autoplay = async (from: number, lead: boolean) => {
    if (alive) return;
    alive = true;
    const id = ++loopId;
    let i = from;
    if (lead && !(await sleep(3200, token))) {
      if (loopId === id) alive = false;
      return;
    }
    while (await play(i)) {
      if (!(await sleep(4200, token))) break;
      i = next(i);
    }
    if (loopId === id) alive = false;
  };

  /** Visitor picked a screen or question. */
  const choose = (i: number) => {
    token++;
    loopId++;
    alive = false;
    idx = i;
    frame(i);
    settle(i);
    if (isReduced) return;
    if (paused) return;
    void autoplay(i, false);
  };

  const firstOnScreen = (screen: string) => chips.findIndex((c) => screenOf(c) === screen);

  chips.forEach((chip, i) => chip.addEventListener('click', () => choose(i)));
  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => {
      if (tab.getAttribute('aria-selected') === 'true') return;
      choose(firstOnScreen(tab.dataset.screen ?? ''));
    });
    tab.addEventListener('keydown', (event) => {
      const step =
        event.key === 'ArrowDown' || event.key === 'ArrowRight'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
            ? -1
            : 0;
      if (!step) return;
      event.preventDefault();
      const target = tabs[(n + step + tabs.length) % tabs.length] ?? tab;
      target.focus();
      target.click();
    });
  });

  highlight(0);

  if (isReduced) return;

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
      if (!paused && !alive) void autoplay(next(idx), false);
    });
  }

  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    if (onScreen && !alive && !paused) void autoplay(started ? next(idx) : idx, true);
    started = true;
  }).observe(root);
}
