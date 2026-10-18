/**
 * One gear row's shell, shared by the shared trip and the idea editor: padded inside its own
 * rounded area (so the claim wash stays within it), with an inset hairline divider. The list
 * pulls the rows out by the same padding, so content stays on the card's edge.
 */
export const packingRowClass =
  'relative isolate rounded-lg px-3 py-3 after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-border last:after:hidden';

/** Lets the browser skip layout and paint for rows far off screen, which keeps long lists smooth. */
export const packingRowDeferredClass =
  '[contain-intrinsic-size:auto_5rem] [content-visibility:auto]';

/** Right-hand column: aligned between the shared rows and the editor's. */
export const packingActionColumnClass = 'sm:w-32';

export const packingListClass = '-mx-3 flex flex-col';
