import {
  approvalStatus,
  stepCopy,
  stepLabels,
  trainTime,
  type IdeaState
} from '@/content/feature-ideas';

const stepMs = 3800;
const order: IdeaState[] = ['proposed', 'changes', 'applied'];
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
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

/** Reorders the plan rows and, unless told otherwise, glides each row from its old place. */
function reorder(list: HTMLElement, rows: HTMLElement[], ids: string[], animate: boolean): void {
  const current = [...list.children].map((child) => child.getAttribute('data-row'));
  if (ids.every((id, index) => id === current[index])) return;
  const before = new Map(rows.map((row) => [row, row.getBoundingClientRect().top]));
  const byId = new Map(rows.map((row) => [row.dataset.row, row]));
  for (const id of ids) {
    const row = byId.get(id);
    if (row) list.append(row);
  }
  if (!animate) return;
  for (const row of rows) {
    const delta = (before.get(row) ?? 0) - row.getBoundingClientRect().top;
    if (delta)
      row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: 650,
        easing: ease
      });
  }
}

function renderVotes(root: HTMLElement, state: IdeaState): void {
  root.querySelectorAll<HTMLElement>('[data-person]').forEach((item, index) => {
    const info = approvalStatus[state][item.dataset.person as Person];
    const delay = info.on ? `${index * 160}ms` : '0ms';
    item.dataset.on = String(info.on);
    item.querySelector<HTMLElement>('.avatar')?.style.setProperty('transition-delay', delay);
    const text = item.querySelector('[data-vote-text]');
    if (text) text.textContent = info.text;
  });
}

function renderRows(rows: HTMLElement[], state: IdeaState, view: View): void {
  for (const row of rows) {
    const mode = rowMode(row.dataset.origin ?? '', state, view);
    row.dataset.mode = mode;
    row.toggleAttribute('inert', mode === 'gone');
    const tag = row.querySelector('[data-tag]');
    if (tag) tag.textContent = tagText[mode];
    const time = row.querySelector('[data-row-time]');
    if (time && row.dataset.row === 'idea-0') time.textContent = trainTime[state];
  }
}

function arrive(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-line]').forEach((line, index) => {
    line.animate(
      [
        { opacity: 0, transform: 'translateX(-16px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: 650, delay: index * 110, easing: ease, fill: 'backwards' }
    );
  });
}

function renderChrome(root: HTMLElement, state: IdeaState): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    button.setAttribute('aria-pressed', String(button.dataset.step === state));
  }
  const status = root.querySelector('[data-status]');
  if (status) {
    status.textContent = stepLabels[state];
    status.classList.toggle('chip-done', state === 'applied');
  }
  const live = root.querySelector('[data-live]');
  if (live) live.textContent = stepCopy[state];
  const trainLine = root.querySelectorAll('[data-line] .time')[2];
  if (trainLine) trainLine.textContent = trainTime[state];
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
  let onScreen = false;
  let timer: number | undefined;

  const render = (next: IdeaState, animate = true) => {
    const changed = next !== state;
    state = next;
    root.dataset.state = state;
    root.style.setProperty('--step-ms', `${stepMs}ms`);
    renderChrome(root, state);
    renderVotes(root, state);
    renderRows(rows, state, view);
    const time = (row: HTMLElement) =>
      row.dataset.row === 'idea-0'
        ? trainTime[state]
        : (row.querySelector('[data-row-time]')?.textContent ?? '');
    const ids = [...rows]
      .sort((a, b) => time(a).localeCompare(time(b)))
      .map((row) => row.dataset.row ?? '');
    reorder(list, rows, ids, animate && !reduce);
    if (changed && animate && !reduce) arrive(root);
  };

  const sync = () => {
    const running = onScreen && !paused && !reduce && document.visibilityState === 'visible';
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
    if (label) label.textContent = paused ? 'Play' : 'Pause';
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
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    sync();
  }).observe(root);
}
