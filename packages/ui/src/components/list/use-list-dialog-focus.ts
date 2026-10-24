import { useRef } from 'react';

/** Return to the actual opener, including an external mobile action instead of a hidden trigger. */
export function useListDialogFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      const target = opener.current;
      if (target?.isConnected && target.getClientRects().length > 0) {
        event.preventDefault();
        target.focus();
      }
    }
  };
}
