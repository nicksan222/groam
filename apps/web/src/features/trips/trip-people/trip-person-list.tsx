import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

/** The bordered, rounded list a manifest group's rows live in; Blocked warms its border. */
export function TripPersonList({
  children,
  warning = false
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <ul
      className={cn(
        'overflow-hidden rounded-lg border',
        warning
          ? 'border-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-border))]'
          : 'border-border'
      )}
    >
      {children}
    </ul>
  );
}
