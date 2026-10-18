import { Toaster } from '@groam/ui/components/sonner';
import { Spinner } from '@groam/ui/components/spinner';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { Activity, lazy, Suspense } from 'react';
import { useSessionChange } from '@/features/auth/hooks/use-session-change';
import { SessionChangeContext } from '@/features/auth/session-change-context';

const AuthScreen = lazy(() =>
  import('@/features/auth/auth-screen').then(({ AuthScreen }) => ({
    default: AuthScreen
  }))
);
const AppRouter = lazy(() =>
  import('@/router').then(({ AppRouter }) => ({
    default: AppRouter
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

export default function App() {
  const { changeSession, isChangingSession } = useSessionChange();

  return (
    <SessionChangeContext value={changeSession}>
      <AuthLoading>
        <LoadingSession />
      </AuthLoading>
      <Authenticated>
        {/* Hidden, the router keeps its state in case the session survives (a wrong code); once
            Convex holds a new session it remounts. */}
        {isChangingSession && <LoadingSession />}
        <Activity mode={isChangingSession ? 'hidden' : 'visible'}>
          <Suspense fallback={<LoadingSession />}>
            <AppRouter />
          </Suspense>
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
