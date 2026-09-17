import { env } from '@groam/env/web-client';
import { AuthCard } from '@groam/ui/components/auth-card';
import { AuthShell } from '@groam/ui/components/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { useAuthForm } from '@/features/auth/hooks/use-auth-form';

export function AuthScreen() {
  const authForm = useAuthForm();
  const { isSignIn } = authForm;

  return (
    <AuthShell>
      <AuthCard
        description={
          isSignIn
            ? env.isDesktop
              ? 'Sign in to the group on this computer'
              : 'Sign in to continue your journey'
            : env.isDesktop
              ? 'Create an account stored on this computer'
              : 'Start building with Groam'
        }
        footer={<AuthLegal />}
        headerExtra={
          isSignIn ? null : (
            <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground/80">
              Your realtime workspace awaits
            </span>
          )
        }
        title={isSignIn ? 'Welcome back' : 'Create your account'}
      >
        <AuthForm {...authForm} />
      </AuthCard>
    </AuthShell>
  );
}

function AuthLegal() {
  if (env.isDesktop) {
    return <>Groam keeps this group on this computer. You can export it from Settings → Data.</>;
  }

  return (
    <>
      By continuing, you agree to our{' '}
      <a
        className="underline underline-offset-2"
        href="https://groam.app/terms"
        rel="noreferrer"
        target="_blank"
      >
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        className="underline underline-offset-2"
        href="https://groam.app/privacy"
        rel="noreferrer"
        target="_blank"
      >
        Privacy Policy
      </a>
      .
    </>
  );
}
