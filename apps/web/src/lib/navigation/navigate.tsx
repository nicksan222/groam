import { useEffect } from 'react';
import { useVisit } from '@/lib/navigation/hooks';
import { href } from '@/lib/navigation/paths';
import type { NavigateTarget, RouteTarget } from '@/types/navigation';

/**
 * Redirects to a typed destination once rendered; route pages use it for redirects. A redirect
 * is not a page change the person chose, so it skips the view transition unless asked.
 */
export function Navigate({
  preserveScroll,
  replace,
  viewTransition = false,
  ...target
}: NavigateTarget) {
  const visit = useVisit();
  const url = href(target as RouteTarget);
  useEffect(() => {
    // A failed visit leaves the current page; the router reports the navigation error itself.
    visit(url, { preserveScroll, replace, viewTransition }).catch(() => undefined);
  }, [url, preserveScroll, replace, viewTransition, visit]);
  return null;
}
