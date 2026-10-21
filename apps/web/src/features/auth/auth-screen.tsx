import { env } from '@groam/env/web-client';
import { AuthCard } from '@groam/ui/components/auth-card';
import { AuthShell } from '@groam/ui/components/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { EmailLinkRequest } from '@/features/auth/email-link-request';
import { useAuthForm } from '@/features/auth/hooks/use-auth-form';
import { passwordResetCallback } from '@/features/auth/password-reset-callback';
import { PasswordResetForm } from '@/features/auth/password-reset-form';

export function AuthScreen() {
  const authForm = useAuthForm();
  const resetToken = passwordResetCallback()?.token;
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
        {resetToken ? (
          <PasswordResetForm token={resetToken} />
        ) : (
          <>
            <AuthForm {...authForm} />
            <EmailLinkRequest />
          </>
        )}
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
        href={new URL('/terms/', env.landingUrl).href}
        rel="noreferrer"
        target="_blank"
      >
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        className="underline underline-offset-2"
        href={new URL('/privacy/', env.landingUrl).href}
        rel="noreferrer"
        target="_blank"
      >
        Privacy Policy
      </a>
      .
    </>
  );
}
