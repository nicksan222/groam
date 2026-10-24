import type { Icon } from '@groam/icons';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

/** A quiet inline notice for a trip page: one soft line with an optional action, never a band. */
export function TripInlineNotice({
  action,
  children,
  className,
  icon: Icon,
  label,
  title
}: {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  icon?: Icon;
  label?: string;
  title: string;
}) {
  return (
    <section
      aria-label={label ?? title}
      className={cn(
        'mx-6 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-muted/50 px-4 py-3',
        className
      )}
      data-slot="trip-inline-notice"
    >
      <div className="flex min-w-[min(100%,16rem)] flex-1 items-start gap-3">
        {Icon ? <Icon aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" /> : null}
        <div className="min-w-0 text-sm">
          <p className="font-medium">{title}</p>
          {children ? (
            <MutedCopy as="div" className="mt-1" size="xs">
              {children}
            </MutedCopy>
          ) : null}
        </div>
      </div>
      {action}
    </section>
  );
}
