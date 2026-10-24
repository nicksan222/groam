import { useEffect } from 'react';

/** Sets the browser tab's title while the caller is mounted, then puts the previous one back. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
