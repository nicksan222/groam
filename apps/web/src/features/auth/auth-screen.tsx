import { env } from '@groam/env/web-client';
import { AuthCard } from '@groam/ui/components/auth-card';
import { AuthShell } from '@groam/ui/components/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { EmailRecovery } from '@/features/auth/email-recovery';
import { useAuthForm } from '@/features/auth/hooks/use-auth-form';

export function AuthScreen() {
  const authForm = useAuthForm();
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const { isRecovery, isSignIn } = authForm;

  return (
    <AuthShell>
      <AuthCard
        description={
          isRecovery
            ? 'Use one of the account recovery codes you downloaded from Security settings'
            : isSignIn
              ? 'Sign in to continue your journey'
              : 'Start building with Groam'
        }
        footer={<AuthLegal />}
        headerExtra={
          isSignIn || isRecovery ? null : (
            <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground/80">
              Your realtime workspace awaits
            </span>
          )
        }
        title={
          resetToken
            ? 'Reset your password'
            : isRecovery
              ? 'Recover your account'
              : isSignIn
                ? 'Welcome back'
                : 'Create your account'
        }
      >
        {resetToken ? null : <AuthForm {...authForm} />}
        <EmailRecovery token={resetToken} />
      </AuthCard>
    </AuthShell>
  );
}

function AuthLegal() {
  return (
    <>
      By continuing, you agree to our{' '}
      <a
        className="underline underline-offset-2"
        href={new URL('/terms/', env.siteUrl).href}
        rel="noreferrer"
        target="_blank"
      >
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        className="underline underline-offset-2"
        href={new URL('/privacy/', env.siteUrl).href}
        rel="noreferrer"
        target="_blank"
      >
        Privacy Policy
      </a>
      .
    </>
  );
}
