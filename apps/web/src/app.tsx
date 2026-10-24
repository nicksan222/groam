import { AgentContextProvider } from '@groam/ai/ui/context/agent-context';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Toaster } from '@groam/ui/components/sonner';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { Activity, lazy, type PropsWithChildren, Suspense } from 'react';
import { useSessionChange } from '@/features/auth/hooks/use-session-change';
import { passwordResetCallback } from '@/features/auth/password-reset-callback';
import { SessionChangeContext } from '@/features/auth/session-change-context';
import { RouteErrorBoundary } from '@/features/errors/route-error/route-error-boundary';
import { useLocation } from '@/lib/navigation/router';

const AuthScreen = lazy(() =>
  import('@/features/auth/auth-screen').then(({ AuthScreen }) => ({
    default: AuthScreen
  }))
);

const sessionLoading = (
  <main className="flex min-h-dvh">
    <PageLoading label="Loading session…" />
  </main>
);

/** Session gating around the routed page: signed-in people see it, visitors sign in. */
export default function App({ children }: PropsWithChildren) {
  const { changeSession, isChangingSession } = useSessionChange();
  // Any navigation, including a query change, starts the page over, as a page load would.
  const { pathname, search } = useLocation();

  if (passwordResetCallback()) {
    return (
      <SessionChangeContext value={changeSession}>
        <Suspense fallback={sessionLoading}>
          <AuthScreen />
        </Suspense>
        <Toaster position="bottom-right" richColors />
      </SessionChangeContext>
    );
  }

  return (
    <SessionChangeContext value={changeSession}>
      <AuthLoading>{sessionLoading}</AuthLoading>
      <Authenticated>
        {/* Hidden, the page keeps its state in case the session survives (a wrong code); once
            Convex holds a new session it remounts. */}
        {isChangingSession && sessionLoading}
        <Activity mode={isChangingSession ? 'hidden' : 'visible'}>
          <AgentContextProvider>
            <RouteErrorBoundary location={`${pathname}${search}`}>
              <Suspense fallback={sessionLoading}>{children}</Suspense>
            </RouteErrorBoundary>
          </AgentContextProvider>
        </Activity>
      </Authenticated>
      <Unauthenticated>
        <Suspense fallback={sessionLoading}>
          <AuthScreen />
        </Suspense>
      </Unauthenticated>
      <Toaster position="bottom-right" richColors />
    </SessionChangeContext>
  );
}
