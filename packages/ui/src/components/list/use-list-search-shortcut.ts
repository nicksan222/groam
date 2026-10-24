import { useEffect, useRef } from 'react';

/** Where a key means typing or a menu, not a list shortcut. */
const typingSelector =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

function isOpenKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.repeat || event.isComposing || event.shiftKey) return false;
  return event.key.toLowerCase() === 'k';
}

/** Calls `onOpen` when K is pressed outside typing and menus; held keys and IME input are ignored. */
export function useListSearchShortcut(onOpen: () => void) {
  // The listener attaches once and calls whichever callback rendered last.
  const open = useRef(onOpen);
  useEffect(() => {
    open.current = onOpen;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isOpenKey(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(typingSelector)) return;
      event.preventDefault();
      open.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
