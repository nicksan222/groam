import { AgentContextProvider } from '@groam/ai/ui/context/agent-context';
import { env } from '@groam/env/web-client';
import { Toaster } from '@groam/ui/components/sonner';
import { Spinner } from '@groam/ui/components/spinner';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { Activity, lazy, type PropsWithChildren, Suspense } from 'react';
import { useSessionChange } from '@/features/auth/hooks/use-session-change';
import { SessionChangeContext } from '@/features/auth/session-change-context';
import { RouteErrorBoundary } from '@/features/errors/route-error/route-error-boundary';
import { useLocation } from '@/lib/navigation/router';

const AuthScreen = lazy(() =>
  import('@/features/auth/auth-screen').then(({ AuthScreen }) => ({
    default: AuthScreen
  }))
);

function LoadingSession() {
  return (
    <output
      aria-label="Loading session"
      className="flex min-h-dvh w-full items-center justify-center"
    >
      <Spinner className="size-6" />
    </output>
  );
}

/** Session gating around the routed Void page: signed-in people see it, visitors sign in. */
export default function App({ children }: PropsWithChildren) {
  const { changeSession, isChangingSession } = useSessionChange();
  // Any navigation, including a query change, starts the page over, as a page load would.
  const { pathname, search } = useLocation();

  const resetQuery = new URLSearchParams(window.location.search);
  const atAppRoot =
    window.location.pathname.replace(/\/$/u, '') ===
    new URL(env.siteUrl).pathname.replace(/\/$/u, '');
  const isPasswordReset =
    Boolean(resetQuery.get('token')) && (resetQuery.get('auth') === 'reset-password' || atAppRoot);
  if (isPasswordReset) {
    return (
      <SessionChangeContext value={changeSession}>
        <Suspense fallback={<LoadingSession />}>
          <AuthScreen />
        </Suspense>
        <Toaster position="bottom-right" richColors />
      </SessionChangeContext>
    );
  }

  return (
    <SessionChangeContext value={changeSession}>
      <AuthLoading>
        <LoadingSession />
      </AuthLoading>
      <Authenticated>
        {/* Hidden, the page keeps its state in case the session survives (a wrong code); once
            Convex holds a new session it remounts. */}
        {isChangingSession && <LoadingSession />}
        <Activity mode={isChangingSession ? 'hidden' : 'visible'}>
          <AgentContextProvider>
            <RouteErrorBoundary location={`${pathname}${search}`}>
              <Suspense fallback={<LoadingSession />}>{children}</Suspense>
            </RouteErrorBoundary>
          </AgentContextProvider>
        </Activity>
      </Authenticated>
      <Unauthenticated>
        <Suspense fallback={<LoadingSession />}>
          <AuthScreen />
        </Suspense>
      </Unauthenticated>
      <Toaster position="bottom-right" richColors />
    </SessionChangeContext>
  );
}
