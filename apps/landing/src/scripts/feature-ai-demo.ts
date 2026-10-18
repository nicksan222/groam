import { translateText } from '@/i18n/runtime';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Shows the first `n` characters of `full` and keeps the rest in place, invisible, so the line
 * breaks of the finished text never move while it is typed or streamed.
 */
const paint = (el: HTMLElement, full: string, n: number) => {
  el.replaceChildren(full.slice(0, n));
  if (n >= full.length) return;
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  const rest = document.createElement('span');
  rest.className = 'rest';
  rest.setAttribute('aria-hidden', 'true');
  rest.textContent = full.slice(n);
  el.append(caret, rest);
};

/** A quiet arrival: a short rise and fade. Nothing under reduced motion. */
const arrive = (el: Element | null | undefined, travel = 6, duration = 380) => {
  if (!el || reduced()) return;
  el.animate(
    [
      { opacity: 0, transform: `translateY(${travel}px)` },
      { opacity: 1, transform: 'none' }
    ],
    { duration, easing: ease }
  );
};

/**
 * The assistant demo: questions type in, the answer streams, and the rows it refers to light up.
 * The loop walks every question across all screens. Visitors can switch the screen
 * in view or pick a question; the loop continues from there. It holds still while off screen,
 * while the tab is hidden, and while paused. Under reduced motion nothing autoplays and answers
 * appear whole.
 */
export function playAiDemo(root: HTMLElement): void {
  const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-screen]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  const chipSets = [...root.querySelectorAll<HTMLElement>('[data-chip-set]')];
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

  // A visitor tabbing through the demo holds the loop, so the focused control never moves.
  const held = () => root.matches(':has(:focus-visible:not([data-toggle]))');
  const running = () => onScreen && !paused && !held() && document.visibilityState === 'visible';

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

  let contextWant = context.textContent ?? '';
  /** The "Looking at" text crossfades, so the chip never blinks out. */
  const swapContext = (text: string) => {
    if (text === contextWant) return;
    contextWant = text;
    if (isReduced) {
      context.textContent = text;
      return;
    }
    context
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: ease, fill: 'forwards' })
      .finished.then(() => {
        context.textContent = contextWant;
        for (const a of context.getAnimations()) a.cancel();
        arrive(context, 4, 300);
      })
      .catch(() => undefined);
  };

  const showTabs = (screen: string) => {
    for (const tab of tabs) {
      const on = tab.dataset.screen === screen;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) swapContext(tab.dataset.context ?? '');
    }
  };

  /** Panels and question sets stack in one cell and crossfade, so the demo never changes height. */
  const showPanels = (screen: string) => {
    for (const panel of panels) panel.toggleAttribute('data-off', panel.dataset.panel !== screen);
    for (const set of chipSets) set.toggleAttribute('data-off', set.dataset.chipSet !== screen);
  };

  /** Sets the screen, context chip, chips, and highlights without touching the text. */
  const frame = (i: number) => {
    const chip = chipAt(i);
    const screen = screenOf(chip);
    showTabs(screen);
    showPanels(screen);
    for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
    for (const row of root.querySelectorAll<HTMLElement>('[data-row]')) row.classList.remove('hl');
    proposal?.classList.remove('show');
  };

  const highlight = (i: number) => {
    proposal?.classList.toggle('show', chipAt(i).dataset.proposal === 'true');
    const ids = new Set((chipAt(i).dataset.highlight ?? '').split(','));
    for (const row of root.querySelectorAll<HTMLElement>('[data-row]'))
      row.classList.toggle('hl', ids.has(row.dataset.row ?? ''));
  };

  const fades = () => [question, answer];
  const clearFades = () => {
    for (const el of fades()) for (const a of el.getAnimations()) if (a.id === 'fade') a.cancel();
  };
  const fadeOut = () => {
    if (isReduced) return;
    for (const el of fades())
      el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 240,
        easing: ease,
        fill: 'forwards',
        id: 'fade'
      });
  };

  const settle = (i: number) => {
    clearFades();
    const chip = chipAt(i);
    paint(question, chip.dataset.question ?? '', Infinity);
    paint(answer, chip.dataset.answer ?? '', Infinity);
    reply.classList.remove('thinking');
    question.classList.remove('typing');
    answer.classList.remove('typing');
    status.textContent = `${chip.dataset.question} ${chip.dataset.answer}`;
    highlight(i);
  };

  const typeQuestion = async (text: string, my: number) => {
    for (let n = 1; n <= text.length; n++) {
      if (!(await sleep(22 + Math.random() * 22, my))) return false;
      paint(question, text, n);
    }
    return true;
  };

  /** Plays one question: type it, think, stream the answer, light the rows. */
  const play = async (i: number): Promise<boolean> => {
    const my = ++token;
    idx = i;
    frame(i);
    fadeOut();
    if (!(await sleep(260, my))) return false;
    clearFades();
    const text = chipAt(i).dataset.question ?? '';
    const full = chipAt(i).dataset.answer ?? '';
    const words = full.split(' ');
    status.textContent = '';
    paint(answer, full, 0);
    paint(question, text, 0);
    reply.classList.add('thinking');
    question.classList.add('typing');
    if (!(await typeQuestion(text, my))) return false;
    question.classList.remove('typing');
    if (!(await sleep(900, my))) return false;
    reply.classList.remove('thinking');
    answer.classList.add('typing');
    highlight(i);
    for (let n = 1; n <= words.length; n++) {
      if (!(await sleep(70, my))) return false;
      paint(answer, full, words.slice(0, n).join(' ').length);
    }
    answer.classList.remove('typing');
    settle(i);
    return true;
  };

  const next = (i: number) => (i + 1) % chips.length;

  const autoplay = async (from: number, lead: number) => {
    if (alive) return;
    alive = true;
    const id = ++loopId;
    let i = from;
    if (lead > 0 && !(await sleep(lead, token))) {
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
    if (isReduced) {
      settle(i);
      return;
    }
    // The old answer fades out, the chosen one fades in, and it holds before the loop moves on.
    const my = token;
    fadeOut();
    setTimeout(() => {
      if (my !== token) return;
      settle(i);
      arrive(question, 4);
      arrive(answer, 4);
    }, 260);
    if (paused) return;
    void autoplay(next(i), 4200);
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
      toggle
        .querySelector('.visually-hidden')
        ?.replaceChildren(translateText(paused ? 'Play the demo' : 'Pause the demo'));
      if (!paused && !alive) void autoplay(next(idx), 1200);
    });
  }

  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    if (onScreen && !alive && !paused) void autoplay(started ? next(idx) : idx, 3200);
    started = true;
  }).observe(root);
}
