import { useEffect } from 'react';
import { testIds } from '@/lib/test-ids';

/** Where a key means typing or a menu, not the ledger. */
const typingSelector =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

const panelSelector = `[data-testid="${testIds.queuePanel}"]`;

function focusIn(selector: string) {
  const field = document.querySelector<HTMLElement>(`${panelSelector} ${selector}`);
  field?.focus();
  return field !== null;
}

/** Focuses the add-question input, as pressing C does; false when the panel has none. */
export function focusAddQuestion() {
  return focusIn('[data-slot="inline-add-input"]');
}

/**
 * The ledger's shortcuts: the arrows move the cursor, Enter opens it, X selects it, C adds a question, Esc clears the selection and then lets go of focus. Keys typed into
 * a field or a menu, or with a modifier held, are left alone.
 */
export function useQueueKeys({
  addable,
  clearSelection,
  cursor,
  move,
  selectable,
  selectedCount,
  toggleSelect
}: {
  addable: boolean;
  clearSelection: () => void;
  cursor: string | null;
  move: (step: -1 | 1) => void;
  selectable: boolean;
  selectedCount: number;
  toggleSelect: (id: string) => void;
}) {
  useEffect(() => {
    const press: Record<string, (event: KeyboardEvent) => void> = {
      arrowdown: (event) => {
        event.preventDefault();
        move(1);
      },
      arrowup: (event) => {
        event.preventDefault();
        move(-1);
      },
      c: (event) => {
        if (addable && focusAddQuestion()) event.preventDefault();
      },
      enter: (event) => {
        // A focused link or button opens itself; this is for focus resting on the page.
        const target = event.target instanceof Element ? event.target : null;
        if (cursor === null || target?.closest('a, button, summary')) return;
        event.preventDefault();
        document
          .querySelector<HTMLElement>(
            `[data-row-id="${CSS.escape(cursor)}"] [data-slot="queue-title"]`
          )
          ?.click();
      },
      escape: (event) => {
        if (selectedCount > 0) {
          event.preventDefault();
          clearSelection();
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      },
      x: () => {
        if (selectable && cursor !== null) toggleSelect(cursor);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(typingSelector) || event.shiftKey) return;
      press[event.key.toLowerCase()]?.(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addable, clearSelection, cursor, move, selectable, selectedCount, toggleSelect]);
}
