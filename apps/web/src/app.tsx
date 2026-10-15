import { authClient } from '@groam/auth/client';
import { Toaster } from '@groam/ui/components/sonner';
import { Spinner } from '@groam/ui/components/spinner';
import { Authenticated, AuthLoading, Unauthenticated, useConvexAuth } from 'convex/react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { SignOutContext } from '@/features/auth/sign-out-context';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';

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
  const { isAuthenticated } = useConvexAuth();
  const resetAuthForm = useAuthFormStore((store) => store.reset);
  const [isSigningOut, setSigningOut] = useState(false);
  if (isSigningOut && !isAuthenticated) setSigningOut(false);

  // The server ends the session before the client hears of it, so leave the workspace first:
  // its queries would otherwise rerun signed out and fail.
  const signOut = useCallback(async () => {
    setSigningOut(true);
    const result = await authClient.signOut();
    if (result.error) setSigningOut(false);
    else resetAuthForm();
  }, [resetAuthForm]);

  return (
    <SignOutContext value={signOut}>
      <AuthLoading>
        <LoadingSession />
      </AuthLoading>
      <Authenticated>
        {isSigningOut ? (
          <LoadingSession />
        ) : (
          <Suspense fallback={<LoadingSession />}>
            <AppRouter />
          </Suspense>
        )}
      </Authenticated>
      <Unauthenticated>
        <Suspense fallback={<LoadingSession />}>
          <AuthScreen />
        </Suspense>
      </Unauthenticated>
      <Toaster position="bottom-right" richColors />
    </SignOutContext>
  );
}
