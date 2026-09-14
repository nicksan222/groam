'use client';

import { AppIcon } from '@groam/ui/components/app-icon';
import { AuroraBackground } from '@groam/ui/components/aurora-background';
import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';

export type AuthShellProps = {
  brandLabel?: string;
  children: ReactNode;
  homeHref?: string;
  homeLabel?: string;
};

const emptySubscribe = () => () => {};

function AuthShell({
  brandLabel = 'groam',
  children,
  homeHref = '/',
  homeLabel = 'Groam home'
}: AuthShellProps) {
  const { resolvedTheme } = useTheme();
  // Client-only theme read — avoid a mount effect flash that React Doctor flags.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const lightMode = mounted ? resolvedTheme !== 'dark' : false;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-muted" data-slot="auth-shell">
      <AuroraBackground className="opacity-90 dark:opacity-80" lightMode={lightMode} />
      <div className="pointer-events-none absolute inset-0 bg-muted/55 dark:bg-muted/35" />
      <div className="relative z-10 flex min-h-dvh w-full flex-col gap-6 px-6 py-8 md:items-center md:justify-center md:p-10">
        <a
          aria-label={homeLabel}
          className="flex items-center gap-2 self-start font-medium md:self-center"
          href={homeHref}
        >
          <AppIcon className="size-8" decorative />
          <span className="text-base font-semibold tracking-tight">{brandLabel}</span>
        </a>
        {children}
      </div>
    </div>
  );
}

export { AuthShell };
