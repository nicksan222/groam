import { createBrowserHistory, RouterProvider } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';
import { createAppRouter } from '@/routes/route-tree';

/**
 * Mounts the app's real route tree in-process: the page for the browser's current URL inside its
 * layouts, on the browser's own history so journeys can read `location` as users see it. Pages
 * render on the client and load no server data, so nothing else needs standing in.
 */
export function JourneyPages({ root }: { root: (page: ReactNode) => ReactNode }) {
  // One router per mounted app, as a page load would start over.
  const [router] = useState(() =>
    createAppRouter({ history: createBrowserHistory(), renderRoot: root })
  );
  // The router owns the browser history listeners; release them when the app unmounts.
  useEffect(() => () => router.history.destroy(), [router]);
  return <RouterProvider router={router} />;
}
