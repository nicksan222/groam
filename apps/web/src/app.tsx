import { Toaster } from '@groam/ui/components/sonner';
import { Spinner } from '@groam/ui/components/spinner';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { lazy, Suspense } from 'react';

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
  return (
    <>
      <AuthLoading>
        <LoadingSession />
      </AuthLoading>
      <Authenticated>
        <Suspense fallback={<LoadingSession />}>
          <AppRouter />
        </Suspense>
      </Authenticated>
      <Unauthenticated>
        <Suspense fallback={<LoadingSession />}>
          <AuthScreen />
        </Suspense>
      </Unauthenticated>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
