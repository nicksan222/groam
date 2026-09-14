import { IconTile } from '@groam/ui/components/icon-tile';
import type * as React from 'react';
import { cn } from '#src/lib/utils';

export type WorkspaceNoticeProps = Omit<React.ComponentProps<'section'>, 'title'> & {
  action?: React.ReactNode;
  compact?: boolean;
  description: React.ReactNode;
  icon: React.ReactNode;
  title: React.ReactNode;
};

function WorkspaceNotice({
  action,
  children,
  className,
  compact = false,
  description,
  icon,
  title,
  ...props
}: WorkspaceNoticeProps) {
  return (
    <section
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between',
        compact
          ? 'gap-2 rounded-lg border border-border px-2.5 py-1.5'
          : 'gap-4 rounded-xl border border-border p-4',
        className
      )}
      {...props}
    >
      <div className={cn('flex min-w-0 gap-2.5', compact ? 'items-center' : 'items-start gap-3')}>
        <IconTile className={compact ? 'rounded-full' : undefined} size={compact ? 'xs' : 'md'}>
          {icon}
        </IconTile>
        <div className="min-w-0">
          <div
            className={cn(
              'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm',
              compact ? 'font-medium' : 'font-semibold'
            )}
          >
            {title}
          </div>
          <div
            className={cn(
              'mt-0.5 text-xs text-muted-foreground',
              compact ? 'leading-4' : 'mt-1 leading-5'
            )}
          >
            {description}
          </div>
          {children}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

export { WorkspaceNotice };
