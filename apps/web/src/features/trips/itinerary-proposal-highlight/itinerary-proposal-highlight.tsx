import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import {
  compactChangeSummary,
  highlightBadgeLabel,
  type ItineraryChange,
  type ItineraryChangeKind
} from '@/features/trips/hooks/itinerary-proposal-changes';

const KIND_RAIL: Record<ItineraryChangeKind, string> = {
  added: 'bg-primary',
  modified: 'bg-chart-4',
  removed: 'bg-destructive'
};

export function ItineraryProposalHighlight({
  change,
  children,
  className
}: {
  change: ItineraryChange | null;
  children: ReactNode;
  className?: string;
}) {
  if (!change) return children;
  const summary = compactChangeSummary(change);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-0',
        change.change === 'removed' && 'opacity-70',
        className
      )}
      data-proposal-change={change.change}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-1.5 left-0 w-0.5 rounded-full', KIND_RAIL[change.change])}
        data-proposal-rail={change.change}
      />
      <span className="sr-only">{highlightBadgeLabel(change.change)}</span>
      {change.change === 'modified' && summary ? (
        <p className="mb-1.5 min-w-0 ps-2.5 text-[11px] leading-4 text-muted-foreground">
          {summary}
        </p>
      ) : null}
      <div
        className={cn(
          'ps-2.5',
          change.change === 'removed' && 'line-through decoration-muted-foreground/70'
        )}
      >
        {children}
      </div>
    </div>
  );
}
