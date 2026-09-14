import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** Geometric G shared with `apps/web/public/groam.svg`. */
const glyphPath =
  'M11.15 7.7h9.7a4.55 4.55 0 0 1 4.55 4.55v.45h-4.2v-.2a1.4 1.4 0 0 0-1.4-1.4h-7.5a1.4 1.4 0 0 0-1.4 1.4v7.1a1.4 1.4 0 0 0 1.4 1.4h7.5a1.4 1.4 0 0 0 1.4-1.4v-1.15h4.2v1.45a4.55 4.55 0 0 1-4.55 4.55h-9.7A4.55 4.55 0 0 1 6.6 19.8v-7.55A4.55 4.55 0 0 1 11.15 7.7zM15.3 13.85h10.1v3.85H15.3zM21.2 13.85h4.2v6.9h-4.2z';

export type AppIconProps = React.ComponentProps<'svg'> & {
  decorative?: boolean;
};

/** Groam product mark: rounded square, geometric G, lime paper-fold edge. */
export function AppIcon({ className, decorative = false, ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'Groam'}
      className={cn('size-8 shrink-0 text-sidebar-primary-foreground', className)}
      fill="none"
      role={decorative ? undefined : 'img'}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect className="fill-sidebar-primary" height="32" rx="7" width="32" />
      <path className="fill-primary" d={glyphPath} transform="translate(1.4 1.05)" />
      <path className="fill-current" d={glyphPath} />
    </svg>
  );
}
