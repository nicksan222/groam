import { AgentContextProvider } from '@groam/ui/ai/context/agent-context';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { RouteError } from '@/features/errors/route-error/route-error';
import { RouteNotFound } from '@/features/errors/route-error/route-not-found';

function RootLayout() {
  return (
    <AgentContextProvider>
      <Outlet />
    </AgentContextProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound
});
