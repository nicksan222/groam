import {
  issueAt,
  issues,
  issuesCopy,
  lap,
  start,
  startSets,
  type LoopStep
} from '@/content/feature-issues';
import { translateText } from '@/i18n/runtime';
import { fixHtml, rowHtml } from '@/scripts/feature-issues-row';
import { updateLoopControl } from '@/scripts/loop-control';

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
  let said = status.textContent ?? '';
  // Old and new lines stack in one grid cell and trade places with opposite fades, so the
  // status line is never empty.
  const layer = (text: string) => {
    const el = document.createElement('span');
    el.className = 'said';
    el.textContent = text;
    return el;
  };
  status.replaceChildren(layer(said));
  const say = (source: string) => {
    const text = translateText(source);
    if (text === said) return;
    said = text;
    if (reduced) {
      status.replaceChildren(layer(text));
      return;
    }
    const fresh = layer(text);
    for (const old of status.children) {
      void old
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: ms(160),
          easing: ease,
          fill: 'forwards'
        })
        .finished.then(() => old.remove())
        .catch(() => undefined);
    }
    status.append(fresh);
    fresh.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: 380, delay: 160, easing: ease, fill: 'backwards' }
    );
  };

  const setCount = (name: 'open' | 'closed', value: number, animate: boolean) => {
    const el = root.querySelector<HTMLElement>(`[data-count="${name}"]`);
    if (!el || el.textContent === String(value)) return;
    el.textContent = String(value);
    if (!animate) return;
    el.animate(
      [
        { transform: 'translateY(30%)', opacity: 0.3 },
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
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: ms(560), easing: ease }
    );

  // Holds both lists at the height of the three tallest rows, so the board keeps one height
  // through the whole lap however many rows are open.
  const reserve = () => {
    const probe = document.createElement('ul');
    probe.className = 'fi-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = `position:absolute;top:0;visibility:hidden;pointer-events:none;left:0;width:${body.clientWidth}px`;
    const states = ['open', 'fix'] as const;
    probe.innerHTML = issues
      .flatMap((issue, id) => states.map((state) => rowHtml(id, issue, state)))
      .join('');
    body.append(probe);
    const rows = [...probe.children] as HTMLElement[];
    // Each row at its tallest, whether or not it has an idea linked yet.
    const tallest = issues.map((_, id) =>
      Math.max(rows[id * 2]?.offsetHeight ?? 0, rows[id * 2 + 1]?.offsetHeight ?? 0)
    );
    probe.remove();
    tallest.sort((a, b) => b - a);
    // At most two loose ends are open at once.
    const total = (tallest[0] ?? 0) + (tallest[1] ?? 0) + 8;
    for (const list of [openList, closedList]) list.style.height = `${total}px`;
  };

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
    const text = row.querySelector<HTMLElement>('.fi-text');
    const old = row.querySelector<HTMLElement>('.fi-fix');
    const before = row.offsetHeight;
    flip(openList, () => {
      row.dataset.state = 'fix';
      if (old && text) {
        // The empty note stays put, fading out, while the strip takes its place.
        old.style.cssText = `position:absolute;top:${old.offsetTop}px;left:${old.offsetLeft}px;pointer-events:none`;
        void old
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: ms(260),
            easing: ease,
            fill: 'forwards'
          })
          .finished.then(() => old.remove())
          .catch(() => undefined);
        if (reduced) old.remove();
      }
      text?.insertAdjacentHTML('beforeend', fixHtml(issueAt(id), 'fix'));
    });
    const after = row.offsetHeight;
    if (after !== before)
      row.animate([{ height: `${before}px` }, { height: `${after}px` }], {
        duration: ms(520),
        easing: ease
      });
    row.querySelector('.fi-fix.strip')?.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
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
        { opacity: 0, transform: 'translateX(12px)' }
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
    const held = root.matches(':has(:focus-visible:not([data-toggle]))');
    const running =
      !reduced && onScreen && !paused && !held && document.visibilityState === 'visible';
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

  let selectionVersion = 0;
  const lists = [openList, closedList];
  const cancelListAnimations = () => {
    for (const list of lists) for (const running of list.getAnimations()) running.cancel();
  };
  const settleSelection = (shown: HTMLElement, visible: HTMLElement | undefined) => {
    const opacity = visible === shown ? getComputedStyle(shown).opacity : '0';
    cancelListAnimations();
    for (const list of lists) {
      list.hidden = list !== shown;
      list.inert = list !== shown;
    }
    if (!reduced && opacity !== '1')
      shown.animate([{ opacity }, { opacity: 1 }], { duration: ms(180), easing: ease });
  };
  const crossfadeSelection = (shown: HTMLElement, visible: HTMLElement, version: number) => {
    const from = getComputedStyle(visible);
    const opacity = from.opacity;
    const transform = from.transform;
    cancelListAnimations();
    visible.inert = true;
    const out = visible.animate(
      [
        { opacity, transform },
        { opacity: 0, transform: 'translateY(-4px)' }
      ],
      { duration: ms(150), easing: ease, fill: 'forwards' }
    );
    void out.finished
      .then(() => {
        if (version !== selectionVersion) return;
        visible.hidden = true;
        shown.hidden = false;
        shown.inert = false;
        out.cancel();
        shown.animate(
          [
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'none' }
          ],
          { duration: ms(320), easing: ease }
        );
      })
      .catch(() => undefined);
  };
  const select = (index: number) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    const shown = lists[index];
    if (!shown) return;
    const version = ++selectionVersion;
    const visible = lists.find((list) => !list.hidden);
    if (!visible || visible === shown || reduced) {
      settleSelection(shown, visible);
      return;
    }
    crossfadeSelection(shown, visible, version);
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
  reserve();
  void document.fonts?.ready.then(reserve);
  let lastWidth = root.clientWidth;
  new ResizeObserver(() => {
    if (root.clientWidth === lastWidth) return;
    lastWidth = root.clientWidth;
    reserve();
  }).observe(root);

  root.addEventListener('focusin', sync);
  root.addEventListener('focusout', () => window.setTimeout(sync, 0));
  if (!reduced) {
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      paused = !paused;
      root.classList.toggle('paused', paused);
      updateLoopControl(toggle, paused, {
        play: 'Play the issue board',
        pause: 'Pause the issue board'
      });
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    }).observe(root);
  }
}
