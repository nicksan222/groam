import {
  issueAt,
  issues,
  issuesCopy,
  lap,
  start,
  startSets,
  type LoopStep
} from '@/content/feature-issues';
import { fixHtml, rowHtml } from '@/scripts/feature-issues-row';

type Slot = { where: 'open' | 'closed' | 'none'; linked: boolean; checking: boolean };

const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Plays the issue board forever. Loose ends arrive, an idea is linked, the idea is applied and
 * the issue checks itself off into Closed; after a lap the board crossfades back to its opening
 * state. Steps are chained timeouts, so pausing stops everything. The viewer can apply an idea
 * and flip between Open and Closed. No loop under reduced motion; controls still work.
 */
export function playIssueBoard(root: HTMLElement): void {
  const openList = root.querySelector<HTMLUListElement>('[data-list="open"]');
  const closedList = root.querySelector<HTMLUListElement>('[data-list="closed"]');
  const body = root.querySelector<HTMLElement>('[data-body]');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const apply = root.querySelector<HTMLButtonElement>('[data-apply]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  if (!openList || !closedList || !body || !apply || !toggle || !status || tabs.length !== 2)
    return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (n: number) => (reduced ? 0 : n);

  const slots: Slot[] = [];
  let cursor = 0;
  let paused = false;
  let onScreen = false;
  let timer: number | undefined;

  const rowOf = (list: HTMLElement, id: number) =>
    list.querySelector<HTMLLIElement>(`[data-key="${id}"]`);
  const say = (text: string) => {
    status.textContent = text;
  };

  const setCount = (name: 'open' | 'closed', value: number, animate: boolean) => {
    const el = root.querySelector<HTMLElement>(`[data-count="${name}"]`);
    if (!el || el.textContent === String(value)) return;
    el.textContent = String(value);
    if (!animate) return;
    el.animate(
      [
        { transform: 'translateY(40%) scale(0.8)', opacity: 0.3 },
        { transform: 'none', opacity: 1 }
      ],
      { duration: ms(420), easing: ease }
    );
  };

  const refresh = (animate = true) => {
    setCount(
      'open',
      openList.querySelectorAll('.fi-row:not(.is-leaving):not(.is-closing)').length,
      animate
    );
    setCount('closed', closedList.querySelectorAll('.fi-row:not(.is-leaving)').length, animate);
    apply.disabled = !slots.some(
      (slot, id) => slot.where === 'open' && slot.linked && !slot.checking && rowOf(openList, id)
    );
  };

  // Slides every remaining row from where it was to where it now sits.
  const flip = (list: HTMLElement, mutate: () => void) => {
    const before = new Map<Element, number>();
    for (const row of list.children) before.set(row, row.getBoundingClientRect().top);
    mutate();
    for (const row of list.children) {
      const was = before.get(row);
      if (was === undefined || row.classList.contains('is-leaving')) continue;
      const delta = was - row.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      row.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: ms(520),
        easing: ease
      });
    }
  };

  const enter = (row: Element | null) =>
    row?.animate(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: ms(560), easing: ease }
    );

  const build = () => {
    slots.length = 0;
    for (let id = 0; id < issues.length; id += 1) {
      const where = startSets.open.has(id) ? 'open' : startSets.closed.has(id) ? 'closed' : 'none';
      slots.push({
        where,
        linked: where === 'closed' || startSets.linked.has(id),
        checking: false
      });
    }
    openList.innerHTML = start.open
      .map((id) => rowHtml(id, issueAt(id), startSets.linked.has(id) ? 'fix' : 'open'))
      .join('');
    closedList.innerHTML = start.closed.map((id) => rowHtml(id, issueAt(id), 'closed')).join('');
    say(issuesCopy.idle);
    refresh(false);
  };

  const arrive = (id: number) => {
    const slot = slots[id];
    if (slot?.where !== 'none') return;
    slot.where = 'open';
    flip(openList, () =>
      openList.insertAdjacentHTML('beforeend', rowHtml(id, issueAt(id), 'open'))
    );
    enter(rowOf(openList, id));
    say(issuesCopy.opened(issueAt(id).title));
    refresh();
  };

  const link = (id: number) => {
    const slot = slots[id];
    const row = rowOf(openList, id);
    if (slot?.where !== 'open' || slot.linked || !row) return;
    slot.linked = true;
    row.dataset.state = 'fix';
    row.querySelector('.fi-fix')?.remove();
    row.querySelector('.fi-text')?.insertAdjacentHTML('beforeend', fixHtml(issueAt(id), 'fix'));
    row.querySelector('.fi-fix')?.animate(
      [
        { opacity: 0, transform: 'translateX(-10px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: ms(520), easing: ease }
    );
    say(issuesCopy.linked(issueAt(id).idea));
    refresh();
  };

  const check = (id: number) => {
    const slot = slots[id];
    const row = rowOf(openList, id);
    if (slot?.where !== 'open' || !slot.linked || slot.checking || !row) return false;
    slot.checking = true;
    row.dataset.state = 'closing';
    row.classList.add('is-closing');
    say(issuesCopy.closed);
    refresh();
    return true;
  };

  // The row leaves the flow in the same frame the rest reflow, while its copy arrives in Closed.
  const move = (id: number) => {
    const slot = slots[id];
    const row = rowOf(openList, id);
    if (!slot || !slot.checking || !row) return;
    slot.where = 'closed';
    slot.checking = false;
    flip(openList, () => {
      row.classList.add('is-leaving');
      row.style.top = `${row.offsetTop}px`;
    });
    const fade = row.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateX(28px)' }
      ],
      { duration: ms(380), easing: ease, fill: 'forwards' }
    );
    void fade.finished.then(() => row.remove());
    if (reduced) row.remove();
    flip(closedList, () =>
      closedList.insertAdjacentHTML('afterbegin', rowHtml(id, issueAt(id), 'closed'))
    );
    enter(rowOf(closedList, id));
    refresh();
  };

  const crossfade = (kind: 'fade' | 'reset') => {
    if (kind === 'fade') {
      body.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 220,
        easing: 'ease-in',
        fill: 'forwards'
      });
      return;
    }
    build();
    for (const animation of body.getAnimations()) animation.cancel();
    body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: ease });
  };

  const actions: Record<LoopStep['op'], (id: number) => unknown> = {
    link,
    arrive,
    check,
    move,
    fade: () => crossfade('fade'),
    reset: () => crossfade('reset')
  };

  const run = (step: LoopStep) => {
    actions[step.op](step.id ?? 0);
  };

  const tick = () => {
    timer = undefined;
    const step = lap[cursor];
    cursor = (cursor + 1) % lap.length;
    if (!step) return;
    run(step);
    timer = window.setTimeout(tick, step.wait);
  };

  const sync = () => {
    const running = !reduced && onScreen && !paused && document.visibilityState === 'visible';
    if (running && timer === undefined) timer = window.setTimeout(tick, 600);
    if (!running && timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    for (const animation of root.getAnimations({ subtree: true })) {
      if (paused) animation.pause();
      else if (animation.playState === 'paused') animation.play();
    }
  };

  const select = (index: number) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    openList.hidden = index !== 0;
    closedList.hidden = index !== 1;
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const next = (index + 1) % 2;
      select(next);
      tabs[next]?.focus();
    });
  });

  apply.addEventListener('click', () => {
    status.setAttribute('aria-live', 'polite');
    select(0);
    const id = slots.findIndex(
      (slot, index) =>
        slot.where === 'open' && slot.linked && !slot.checking && rowOf(openList, index)
    );
    if (id < 0 || !check(id)) return;
    window.setTimeout(() => move(id), ms(800));
  });

  // Seed the slots from the server-rendered markup without repainting it.
  for (let id = 0; id < issues.length; id += 1) {
    const where = startSets.open.has(id) ? 'open' : startSets.closed.has(id) ? 'closed' : 'none';
    slots.push({ where, linked: where === 'closed' || startSets.linked.has(id), checking: false });
  }
  refresh(false);

  if (!reduced) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('paused', paused);
      toggle.setAttribute('aria-pressed', String(paused));
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    }).observe(root);
  }
}
