import {
  approvalStatus,
  stepCopy,
  stepLabels,
  trainTime,
  type IdeaState
} from '@/content/feature-ideas';
import { translateText } from '@/i18n/runtime';

const stepMs = 3800;
const order: IdeaState[] = ['proposed', 'changes', 'applied'];
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
/**
 * Replaces text in two calm steps: the old text fades out where it is, then the new text fades in.
 * The two never show together, and the element keeps its own box so nothing is pinned elsewhere.
 */
const pending = new WeakMap<Element, string>();
function swapText(el: Element | null | undefined, source: string, animate: boolean): void {
  if (!el) return;
  const text = translateText(source);
  if (!animate) {
    el.textContent = text;
    return;
  }
  if (pending.has(el)) {
    pending.set(el, text);
    return;
  }
  if (el.textContent === text) return;
  pending.set(el, text);
  const out = el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 160,
    easing: ease,
    fill: 'forwards'
  });
  const finish = () => {
    el.textContent = pending.get(el) ?? text;
    pending.delete(el);
    out.cancel();
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: ease });
  };
  void out.finished.then(finish, finish);
}

type View = 'live' | 'idea';
type Mode = 'solid' | 'dashed' | 'struck' | 'gone';
type Person = 'jonas' | 'priya' | 'sam';

const rowMode = (origin: string, state: IdeaState, view: View): Mode => {
  if (origin === 'both') return 'solid';
  if (origin === 'old') {
    if (state === 'applied') return 'gone';
    return view === 'idea' ? 'struck' : 'solid';
  }
  if (state === 'applied') return 'solid';
  return view === 'idea' ? 'dashed' : 'gone';
};

const tagText: Record<Mode, string> = {
  solid: '',
  dashed: 'Proposed',
  struck: 'Removed by idea',
  gone: ''
};

/**
 * Reorders the plan rows. Every row whose top changes glides from its old place (FLIP), staying
 * visible and painted over its neighbours while it passes, so nothing jumps or overprints.
 */
function reorder(list: HTMLElement, rows: HTMLElement[], ids: string[], animate: boolean): void {
  const current = [...list.children].map((child) => child.getAttribute('data-row'));
  if (ids.every((id, index) => id === current[index])) return;
  const before = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));
  const byId = new Map(rows.map((row) => [row.dataset.row, row]));
  let cursor = list.firstElementChild;
  const moved = new Set<HTMLElement>();
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    if (row === cursor) {
      cursor = cursor.nextElementSibling;
      continue;
    }
    list.insertBefore(row, cursor);
    moved.add(row);
  }
  if (!animate) return;
  for (const row of rows) {
    const delta = (before.get(row) ?? 0) - row.getBoundingClientRect().top;
    if (!delta) continue;
    Object.assign(row.style, {
      position: 'relative',
      zIndex: moved.has(row) ? '2' : '1',
      background: 'var(--paper-raised)'
    });
    const glide = row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
      duration: 550,
      easing: ease
    });
    const rest = () => {
      Object.assign(row.style, { position: '', zIndex: '', background: '' });
    };
    void glide.finished.then(rest, rest);
  }
}

function renderVotes(root: HTMLElement, state: IdeaState, animate: boolean): void {
  root.querySelectorAll<HTMLElement>('[data-person]').forEach((item, index) => {
    const info = approvalStatus[state][item.dataset.person as Person];
    const delay = info.on ? `${index * 160}ms` : '0ms';
    item.dataset.on = String(info.on);
    item.querySelector<HTMLElement>('.avatar')?.style.setProperty('transition-delay', delay);
    swapText(item.querySelector('[data-vote-text]'), info.text, animate);
  });
}

function renderRows(rows: HTMLElement[], state: IdeaState, view: View, animate: boolean): void {
  for (const row of rows) {
    const mode = rowMode(row.dataset.origin ?? '', state, view);
    row.dataset.mode = mode;
    row.toggleAttribute('inert', mode === 'gone');
    const tag = row.querySelector('[data-tag]');
    // A row folding away keeps its tag so the text does not blink while it collapses.
    if (tag && mode !== 'gone') swapText(tag, tagText[mode], animate);
    const time = row.querySelector('[data-row-time]');
    if (time && row.dataset.row === 'idea-0') swapText(time, trainTime[state], animate);
  }
}

function renderChrome(root: HTMLElement, state: IdeaState, animate: boolean): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    button.setAttribute('aria-pressed', String(button.dataset.step === state));
  }
  const status = root.querySelector('[data-status]');
  if (status) {
    swapText(status, stepLabels[state], animate);
    status.classList.toggle('chip-done', state === 'applied');
  }
  const live = root.querySelector('[data-live]');
  swapText(live, stepCopy[state], animate);
  swapText(root.querySelectorAll('[data-line] .time')[2], trainTime[state], animate);
  const decide = root.querySelector<HTMLElement>('[data-decide]');
  if (decide) decide.hidden = state === 'applied';
  const stamp = root.querySelector<HTMLElement>('[data-stamp]');
  if (stamp) stamp.hidden = state !== 'applied';
  root.querySelector('[data-request]')?.setAttribute('aria-disabled', String(state === 'changes'));
}

/**
 * Drives the idea card: Proposed -> Changes requested -> Applied, forever. The live plan beside it
 * only turns solid at Applied. Visitors take over with the steps, Approve, or Request changes, which
 * pauses the loop; Play resumes it. Stops under reduced motion, off screen, and in a hidden tab.
 */
export function playIdeasDemo(root: HTMLElement): void {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = root.querySelector<HTMLElement>('[data-rows]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]');
  if (!list) return;
  const rows = [...list.querySelectorAll<HTMLElement>('[data-row]')];

  let state = root.dataset.state as IdeaState;
  const view: View = 'idea';
  let paused = false;
  let focused = false;
  let onScreen = false;
  let timer: number | undefined;

  const render = (next: IdeaState, animate = true) => {
    state = next;
    root.dataset.state = state;
    root.style.setProperty('--step-ms', `${stepMs}ms`);
    const fade = animate && !reduce;
    renderChrome(root, state, fade);
    renderVotes(root, state, fade);
    const time = (row: HTMLElement) =>
      row.dataset.row === 'idea-0'
        ? trainTime[state]
        : (row.querySelector('[data-row-time]')?.textContent ?? '');
    const ids = [...rows]
      .sort((a, b) => time(a).localeCompare(time(b)))
      .map((row) => row.dataset.row ?? '');
    reorder(list, rows, ids, fade);
    // Settle the rows in their new places before their modes change, so each one transitions.
    void list.offsetHeight;
    renderRows(rows, state, view, fade);
  };

  const sync = () => {
    const running =
      onScreen && !paused && !focused && !reduce && document.visibilityState === 'visible';
    root.dataset.running = String(running);
    window.clearTimeout(timer);
    timer = undefined;
    if (!running) return;
    const tick = () => {
      render(order[(order.indexOf(state) + 1) % order.length] as IdeaState);
      timer = window.setTimeout(tick, stepMs);
    };
    timer = window.setTimeout(tick, stepMs);
  };

  const setPaused = (value: boolean) => {
    paused = value;
    toggle?.setAttribute('aria-pressed', String(paused));
    const label = toggle?.querySelector('.play-label');
    if (label) label.textContent = translateText(paused ? 'Play' : 'Pause');
    sync();
  };

  const takeOver = (next: IdeaState) => {
    if (!reduce && !paused) setPaused(true);
    render(next);
  };

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    button.addEventListener('click', () => takeOver(button.dataset.step as IdeaState));
  }
  root
    .querySelector('[data-approve]')
    ?.addEventListener('click', () => state !== 'applied' && takeOver('applied'));
  root
    .querySelector('[data-request]')
    ?.addEventListener('click', () => state !== 'changes' && takeOver('changes'));
  root.querySelector('[data-reset]')?.addEventListener('click', () => takeOver('proposed'));

  if (reduce) {
    render(state, false);
    return;
  }
  render('proposed', false);
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => setPaused(!paused));
  }
  root.addEventListener('focusin', (event) => {
    // The pause control itself never holds the loop.
    focused = !(event.target as Element).closest('[data-toggle]');
    sync();
  });
  root.addEventListener('focusout', (event) => {
    if (root.contains(event.relatedTarget as Node | null)) return;
    focused = false;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    sync();
  }).observe(root);
}
