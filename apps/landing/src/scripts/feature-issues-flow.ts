import { translateText } from '@/i18n/runtime';
const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
const heightRuns = new WeakMap<HTMLElement, Animation>();

function settleHeight(card: HTMLElement, before: number): void {
  heightRuns.get(card)?.cancel();
  const after = card.offsetHeight;
  if (Math.abs(before - after) < 1) return;
  card.style.overflow = 'hidden';
  const run = card.animate([{ height: `${before}px` }, { height: `${after}px` }], {
    duration: 340,
    easing: ease
  });
  heightRuns.set(card, run);
  const finish = () => {
    if (heightRuns.get(card) !== run) return;
    heightRuns.delete(card);
    card.style.overflow = '';
  };
  void run.finished.then(finish).catch(finish);
}

function transitionButton(
  card: HTMLElement,
  button: HTMLButtonElement,
  state: 'open' | 'closed',
  animate: boolean
): void {
  for (const running of button.getAnimations()) running.cancel();
  const hidden = state === 'closed';
  button.disabled = hidden;
  button.inert = hidden;
  button.setAttribute('aria-hidden', String(hidden));
  if (!animate) {
    button.hidden = hidden;
    return;
  }
  if (!hidden) {
    const before = card.offsetHeight;
    button.hidden = false;
    settleHeight(card, before);
    button.animate(
      [
        { opacity: 0, transform: 'translateY(-5px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: 320, easing: ease }
    );
    return;
  }
  const out = button.animate(
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translateY(-5px)' }
    ],
    { duration: 180, easing: ease, fill: 'forwards' }
  );
  void out.finished
    .then(() => {
      if (card.dataset.state !== 'closed') return;
      const before = card.offsetHeight;
      button.hidden = true;
      out.cancel();
      settleHeight(card, before);
    })
    .catch(() => undefined);
}

function transitionChip(
  card: HTMLElement,
  chip: HTMLElement,
  state: 'open' | 'closed',
  animate: boolean
): void {
  const text = translateText(state === 'closed' ? 'Idea applied' : 'Idea linked');
  for (const running of chip.getAnimations()) running.cancel();
  if (!animate || chip.textContent === text) {
    chip.textContent = text;
    return;
  }
  const out = chip.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 120,
    easing: ease,
    fill: 'forwards'
  });
  void out.finished
    .then(() => {
      if (card.dataset.state !== state) return;
      chip.textContent = text;
      out.cancel();
      chip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: ease });
    })
    .catch(() => undefined);
}

/** Moves issues across a two-column Open to Closed timeline when their linked idea is applied. */
const restyle = (card: HTMLElement, state: 'open' | 'closed', animate = false) => {
  const button = card.querySelector<HTMLButtonElement>('[data-apply-card]');
  if (button) transitionButton(card, button, state, animate);
  const chip = card.querySelector<HTMLElement>('.chip');
  if (!chip) return;
  transitionChip(card, chip, state, animate);
  chip.classList.toggle('chip-done', state === 'closed');
  chip.classList.toggle('chip-idea', state === 'open');
};

const settle = (
  cards: HTMLElement[],
  open: HTMLElement,
  closed: HTMLElement,
  state: 'open' | 'closed'
) => {
  for (const card of cards) {
    card.dataset.state = state;
    restyle(card, state);
    (state === 'open' ? open : closed).append(card);
  }
};

/**
 * Side by side, each column is as tall as the three cards stacked. Stacked on a phone, the two
 * columns share one reserve on the pair, so no bare band opens below the last card.
 */
function reserveFlow(cards: HTMLElement[], open: HTMLElement, closed: HTMLElement): void {
  const cols = open.parentElement?.parentElement as HTMLElement | null;
  const was = cards.map((card) => [card, card.dataset.state, card.parentElement] as const);
  for (const column of [open, closed]) column.style.minHeight = '';
  if (cols) cols.style.minHeight = '';
  const stacked = !!cols && getComputedStyle(cols).gridTemplateColumns.split(' ').length === 1;
  const measure = () =>
    stacked && cols ? cols.offsetHeight : cards.reduce((sum, c) => sum + c.offsetHeight, 0);
  settle(cards, open, closed, 'open');
  const openH = measure();
  settle(cards, open, closed, 'closed');
  const total = Math.max(openH, measure());
  for (const [card, state, parent] of was) {
    card.dataset.state = state;
    restyle(card, state === 'closed' ? 'closed' : 'open');
    parent?.append(card);
  }
  const targets = stacked && cols ? [cols] : [open, closed];
  const extra = stacked ? 0 : 16 * (cards.length - 1);
  for (const el of targets) el.style.minHeight = `${total + extra}px`;
}

export function playIssueFlow(root: HTMLElement): void {
  const open = root.querySelector<HTMLElement>('[data-col="open"]');
  const closed = root.querySelector<HTMLElement>('[data-col="closed"]');
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');
  if (!open || !closed || !reset) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  const home = new Map(cards.map((card) => [card, card.parentElement as HTMLElement]));

  type Move = [HTMLElement, HTMLElement, 'open' | 'closed'];
  // Slides every card from where it was drawn to where it now sits.
  const slide = (before: Map<HTMLElement, DOMRect>, skip?: HTMLElement) => {
    for (const item of cards) {
      const was = before.get(item);
      if (!was || item === skip) continue;
      const now = item.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      // A moving card stays fully opaque and rides above its neighbours until it lands.
      Object.assign(item.style, { position: 'relative', zIndex: '2' });
      const run = item.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 600, easing: ease }
      );
      const land = () => {
        Object.assign(item.style, { zIndex: '', position: '' });
      };
      void run.finished.then(land).catch(land);
    }
  };

  // Moves every listed card in one pass: measure where each is now (as drawn, mid-flight or not),
  // rearrange once, then glide each card from its old spot. The columns keep one height, so the
  // band never changes size.
  let moveVersion = 0;
  const place = (moves: Move[], stay?: HTMLElement) => {
    const version = ++moveVersion;
    const before = new Map(cards.map((item) => [item, item.getBoundingClientRect()]));
    for (const item of cards) {
      for (const running of item.getAnimations()) running.cancel();
      item.dataset.leaving = 'false';
    }
    for (const [card, column, state] of moves) {
      column.append(card);
      card.dataset.state = state;
      restyle(card, state, !reduced);
    }
    if (!reduced) slide(before, stay);
    if (stay && !reduced) {
      // One column: the card does not travel. It arrives in Closed where the visitor can see it.
      // It appears only after the other cards have settled, so nothing passes over it.
      stay.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 420,
        delay: 560,
        easing: ease,
        fill: 'backwards'
      });
      window.setTimeout(() => {
        if (version === moveVersion && stay.dataset.state === 'closed') {
          stay.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 560);
    }
    const left = cards.some((item) => item.dataset.state === 'open');
    reset.disabled = left && cards.every((item) => item.dataset.state === 'open');
    root.dataset.settled = String(!left);
  };

  // Both columns are as tall as the three cards stacked, in whichever state is taller.
  const reserve = () => reserveFlow(cards, open, closed);
  reserve();
  void document.fonts?.ready.then(reserve);
  let lastWidth = root.clientWidth;
  new ResizeObserver(() => {
    if (root.clientWidth === lastWidth) return;
    lastWidth = root.clientWidth;
    reserve();
  }).observe(root);

  for (const card of cards) {
    card.querySelector<HTMLButtonElement>('[data-apply-card]')?.addEventListener('click', () => {
      const column = open.parentElement?.parentElement;
      const single =
        !reduced &&
        !!column &&
        getComputedStyle(column).gridTemplateColumns.split(' ').length === 1;
      if (single) {
        if (card.dataset.leaving === 'true') return;
        card.dataset.leaving = 'true';
        void card
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 220,
            easing: ease,
            fill: 'forwards'
          })
          .finished.then(() => {
            for (const a of card.getAnimations()) a.cancel();
            card.dataset.leaving = 'false';
            place([[card, closed, 'closed']], card);
          })
          .catch(() => undefined);
      } else place([[card, closed, 'closed']]);
      const next = cards.find((item) => item !== card && item.dataset.state === 'open');
      (next?.querySelector<HTMLButtonElement>('[data-apply-card]') ?? reset).focus({
        preventScroll: true
      });
    });
  }
  reset.addEventListener('click', () => {
    place(cards.map((card): Move => [card, home.get(card) ?? open, 'open']));
    cards[0]?.querySelector<HTMLButtonElement>('[data-apply-card]')?.focus({ preventScroll: true });
  });
  reset.disabled = true;
}
