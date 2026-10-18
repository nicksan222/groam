/** Moves issues across a two-column Open to Closed timeline when their linked idea is applied. */
const restyle = (card: HTMLElement, state: 'open' | 'closed') => {
  const button = card.querySelector<HTMLButtonElement>('[data-apply-card]');
  if (button) button.hidden = state === 'closed';
  const chip = card.querySelector<HTMLElement>('.chip');
  if (!chip) return;
  chip.textContent = state === 'closed' ? 'Idea applied' : 'Idea linked';
  chip.classList.toggle('chip-done', state === 'closed');
  chip.classList.toggle('chip-idea', state === 'open');
};

export function playIssueFlow(root: HTMLElement): void {
  const open = root.querySelector<HTMLElement>('[data-col="open"]');
  const closed = root.querySelector<HTMLElement>('[data-col="closed"]');
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');
  if (!open || !closed || !reset) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  const home = new Map(cards.map((card) => [card, card.parentElement as HTMLElement]));

  const place = (card: HTMLElement, column: HTMLElement, state: 'open' | 'closed') => {
    const before = new Map(cards.map((item) => [item, item.getBoundingClientRect()]));
    column.append(card);
    card.dataset.state = state;
    restyle(card, state);
    for (const item of cards) {
      const was = before.get(item);
      if (!was || reduced) continue;
      const now = item.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 640,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
    }
    const left = cards.some((item) => item.dataset.state === 'open');
    reset.disabled = left && cards.every((item) => item.dataset.state === 'open');
    root.dataset.settled = String(!left);
  };

  for (const card of cards) {
    card.querySelector<HTMLButtonElement>('[data-apply-card]')?.addEventListener('click', () => {
      place(card, closed, 'closed');
      reset.focus();
    });
  }
  reset.addEventListener('click', () => {
    for (const card of cards) place(card, home.get(card) ?? open, 'open');
    cards[0]?.querySelector<HTMLButtonElement>('[data-apply-card]')?.focus();
  });
  reset.disabled = true;
}
