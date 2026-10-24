import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

/** The thing an event acted on, as a quiet inline chip inside the event's sentence. */
export function IssueEventChip({
  children,
  className,
  leading
}: {
  children: ReactNode;
  className?: string;
  leading?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm bg-muted px-2 align-middle leading-5 font-medium text-foreground',
        className
      )}
    >
      {leading}
      <span className="min-w-0">{children}</span>
    </span>
  );
}
