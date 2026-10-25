'use client';

import { BrandMark } from '@groam/brand/mark';
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
    <div
      className="relative min-h-dvh w-full overflow-x-clip bg-background md:bg-muted"
      data-slot="auth-shell"
    >
      <AuroraBackground
        className="hidden opacity-90 md:block dark:opacity-80"
        lightMode={lightMode}
      />
      <div className="pointer-events-none absolute inset-0 hidden bg-muted/55 md:block dark:bg-muted/35" />
      <div className="relative z-10 flex min-h-dvh w-full flex-col items-center gap-8 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:justify-center md:gap-6 md:p-12">
        <a
          aria-label={homeLabel}
          className="flex min-h-11 w-full max-w-md items-center gap-2 font-medium md:min-h-0 md:w-auto"
          href={homeHref}
        >
          <BrandMark className="size-8 shrink-0" decorative />
          <span className="text-base font-semibold tracking-tight">{brandLabel}</span>
        </a>
        {children}
      </div>
    </div>
  );
}

export { AuthShell };
