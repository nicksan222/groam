import type { Icon } from '@groam/icons';
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
        'mx-6 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-muted/50 px-3.5 py-2.5',
        className
      )}
      data-slot="trip-inline-notice"
    >
      <div className="flex min-w-[min(100%,16rem)] flex-1 items-start gap-2.5">
        {Icon ? (
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : null}
        <div className="min-w-0 text-sm">
          <p className="font-medium">{title}</p>
          {children ? (
            <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{children}</div>
          ) : null}
        </div>
      </div>
      {action}
    </section>
  );
}
