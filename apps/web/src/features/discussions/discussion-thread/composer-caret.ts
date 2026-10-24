/**
 * Focuses a composer input and puts the caret after its last character. The caret goes inside
 * the last text node so the composer can read a trigger query (such as "/link ") at it.
 */
export function focusComposerEnd(input: HTMLElement | null): void {
  if (!input) return;
  input.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return;
  const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  while (walker.nextNode()) last = walker.currentNode as Text;
  if (last) selection.collapse(last, last.length);
  else selection.collapse(input, input.childNodes.length);
}

const MAX_WAIT_FRAMES = 30;

/**
 * Runs `callback` once the composer suggestion popup has finished closing (or after about half a
 * second). Reopening suggestions while the previous popup is still animating out makes the
 * popup's positioner resize in a loop.
 */
export function afterComposerPopupCloses(callback: () => void, frame = 0): void {
  const open = document.querySelector('[data-slot="composer-popup"]') !== null;
  if (!open || frame >= MAX_WAIT_FRAMES) {
    callback();
    return;
  }
  requestAnimationFrame(() => afterComposerPopupCloses(callback, frame + 1));
}
