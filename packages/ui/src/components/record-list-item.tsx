import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

/** A consistent two-line record: title above context and badges, with optional trailing actions. */
export function RecordListItem({
  className,
  badges,
  icon,
  metadata,
  title,
  trailing,
  ...props
}: Omit<ComponentProps<'article'>, 'title'> & {
  badges?: ReactNode;
  icon?: ReactNode;
  metadata?: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <article
      className={cn(
        'group/record relative flex min-w-0 items-start gap-3 px-4 py-4 bg-transparent transition-colors hover:bg-foreground/[0.03] focus-within:bg-foreground/[0.03] sm:px-5',
        className
      )}
      data-slot="record-list-item"
      {...props}
    >
      {icon ? (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div
          className="min-w-0 truncate text-sm leading-6 font-semibold text-foreground sm:text-base"
          data-slot="record-list-title"
        >
          {title}
        </div>
        <div className="mt-2 flex h-6 min-w-0 items-center gap-2" data-slot="record-list-context">
          {metadata ? (
            <div
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-xs leading-5 text-muted-foreground"
              data-slot="record-list-metadata"
            >
              {metadata}
            </div>
          ) : null}
          {badges ? (
            <div
              className="relative z-10 flex shrink-0 items-center gap-1.5"
              data-slot="record-list-badges"
            >
              {badges}
            </div>
          ) : null}
        </div>
      </div>
      {trailing ? (
        <div
          className="relative z-10 hidden shrink-0 items-center gap-4 self-center text-xs leading-5 text-muted-foreground md:flex"
          data-slot="record-list-trailing"
        >
          {trailing}
        </div>
      ) : null}
    </article>
  );
}
