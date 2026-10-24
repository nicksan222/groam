const svg = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

/** Reactions are drawn icons, so they render the same on every device. */
export const reactionIcons = {
  like: svg(
    '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.5 0 2.5 1.2 2.2 2.7L12.7 9H19a2 2 0 0 1 2 2.4l-1.2 6A2.5 2.5 0 0 1 17.4 20H7"/>'
  ),
  love: svg(
    '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10C19.5 15.4 12 20 12 20z"/>'
  ),
  cheer: svg(
    '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>'
  )
};

export const issueTick =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
