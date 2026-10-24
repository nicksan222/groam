import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

export type DetailSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  /** Drops the divider and the vertical padding so sections sit in a tight grid (a phone's properties block). */
  compact?: boolean;
  title: string;
};

function DetailSection({ action, children, compact = false, title }: DetailSectionProps) {
  return (
    <section
      className={cn(
        compact ? 'min-w-0 py-0' : 'border-t border-border/40 py-3 first:border-t-0 first:pt-0'
      )}
      data-slot="detail-section"
    >
      <div className={cn('flex items-center justify-between gap-2', compact && 'min-h-6')}>
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className={compact ? 'mt-1' : 'mt-2'}>{children}</div>
    </section>
  );
}

export { DetailSection };
