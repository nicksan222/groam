import { env } from '@groam/env/web-client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';
import { routeTree } from '@/routeTree.gen';

/** A router that starts from the browser's current location. */
export function createAppRouter() {
  return createRouter({
    basepath: env.baseUrl,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 30_000,
    routeTree,
    scrollRestoration: true
  });
}

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function AppRouter() {
  // Each mount gets its own router, so it reads the URL it is mounted at.
  const [router] = useState(createAppRouter);
  return <RouterProvider router={router} />;
}
