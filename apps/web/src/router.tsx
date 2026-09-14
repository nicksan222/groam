import { env } from '@groam/env/web-client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

const router = createRouter({
  basepath: env.baseUrl,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 30_000,
  routeTree,
  scrollRestoration: true
});

declare module '@tanstack/react-router' {
  // biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
